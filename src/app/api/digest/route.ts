import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSubscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPriceDrops } from "@/lib/blog/queries";
import { getResendClient, buildDigestHtml } from "@/lib/email";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret — same pattern as generate-articles
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCronHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get verified subscribers
    const subscribers = await db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.verified, true));

    if (subscribers.length === 0) {
      return NextResponse.json({ sent: 0, reason: "no subscribers" });
    }

    // Get top 10 price drops from the past 7 days
    const drops = await getPriceDrops(7, 10);

    if (drops.length === 0) {
      return NextResponse.json({ sent: 0, reason: "no price drops this week" });
    }

    const resend = getResendClient();
    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      try {
        const unsubscribeUrl = `https://cheap.ky/api/subscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
        const html = buildDigestHtml(drops, unsubscribeUrl);

        await resend.emails.send({
          from: "Cheap.ky <deals@cheap.ky>",
          to: subscriber.email,
          subject: "This Week's Biggest Price Drops",
          html,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send to subscriber ${subscriber.id}:`, error);
        failed++;
      }
    }

    return NextResponse.json({ sent, failed, totalDrops: drops.length });
  } catch (error) {
    console.error("Digest generation failed:", error);
    return NextResponse.json(
      { error: "Digest failed", details: String(error) },
      { status: 500 }
    );
  }
}
