import { db } from "../../db";
import { storeProducts, products, productMatches } from "../../db/schema";
import { eq, and } from "drizzle-orm";

interface MatchPair {
  storeProductId: number;
  storeProductName: string;
  candidateProductId: number;
  candidateProductName: string;
}

export async function runAiMatching(): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[match:ai] No ANTHROPIC_API_KEY set, skipping AI matching");
    return 0;
  }

  console.log("[match:ai] Starting AI-assisted matching...");

  // Get unverified low-confidence matches for review
  const lowConfidence = await db
    .select()
    .from(productMatches)
    .where(and(eq(productMatches.verified, false)));

  if (lowConfidence.length === 0) {
    console.log("[match:ai] No matches to review");
    return 0;
  }

  // Build pairs for AI review
  const pairs: MatchPair[] = [];
  for (const match of lowConfidence) {
    if (match.confidence >= 0.85) continue;

    const sp = await db.select().from(storeProducts).where(eq(storeProducts.id, match.storeProductId)).limit(1);
    const cp = await db.select().from(products).where(eq(products.id, match.productId)).limit(1);
    if (sp.length > 0 && cp.length > 0) {
      pairs.push({
        storeProductId: sp[0].id,
        storeProductName: sp[0].name,
        candidateProductId: cp[0].id,
        candidateProductName: cp[0].canonicalName,
      });
    }
  }

  if (pairs.length === 0) return 0;

  // Batch into groups of 50
  const batches = [];
  for (let i = 0; i < pairs.length; i += 50) {
    batches.push(pairs.slice(i, i + 50));
  }

  let matchCount = 0;

  for (const batch of batches) {
    const prompt = `You are matching grocery products. For each pair, determine if they are the same product (just sold at different stores). Reply with JSON array of objects: { "index": number, "match": boolean, "confidence": number (0-1) }.

Products to compare:
${batch.map((p, i) => `${i}. "${p.storeProductName}" vs "${p.candidateProductName}"`).join("\n")}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        console.error(`[match:ai] API error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const results = JSON.parse(jsonMatch[0]);

      for (const result of results) {
        const pair = batch[result.index];
        if (!pair) continue;

        if (result.match && result.confidence >= 0.7) {
          // Update match confidence
          await db
            .update(productMatches)
            .set({ confidence: result.confidence, matchMethod: "ai", verified: false })
            .where(eq(productMatches.storeProductId, pair.storeProductId));
          matchCount++;
        }
      }
    } catch (e) {
      console.error("[match:ai] Batch failed:", e);
    }
  }

  console.log(`[match:ai] Updated ${matchCount} matches`);
  return matchCount;
}
