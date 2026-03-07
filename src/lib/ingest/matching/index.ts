import { runUpcMatching } from "./upc-matcher";
import { runFuzzyMatching } from "./fuzzy-matcher";
import { runAiMatching } from "./ai-matcher";

export async function runMatchingPipeline(options?: { skipAi?: boolean }) {
  console.log("[matching] Starting matching pipeline...");

  const upcCount = await runUpcMatching();
  const fuzzyCount = await runFuzzyMatching();

  let aiCount = 0;
  if (!options?.skipAi) {
    aiCount = await runAiMatching();
  }

  console.log(`[matching] Complete. UPC: ${upcCount}, Fuzzy: ${fuzzyCount}, AI: ${aiCount}`);
  return { upcCount, fuzzyCount, aiCount };
}
