import { NextResponse } from "next/server";

export const maxDuration = 60;

/**
 * Combined weekly tasks — runs articles + digest in one cron invocation.
 * Calls the existing endpoints internally so logic stays DRY.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron-secret");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCronHeader !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = new URL(request.url).origin;
  const headers: Record<string, string> = {};
  if (cronSecret) headers["authorization"] = `Bearer ${cronSecret}`;

  const results: Record<string, unknown> = {};

  // 1. Generate articles
  try {
    const articlesRes = await fetch(`${baseUrl}/api/generate-articles`, { headers });
    results.articles = await articlesRes.json();
  } catch (e) {
    results.articles = { error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Send digest emails
  try {
    const digestRes = await fetch(`${baseUrl}/api/digest`, { headers });
    results.digest = await digestRes.json();
  } catch (e) {
    results.digest = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({
    results,
    timestamp: new Date().toISOString(),
  });
}
