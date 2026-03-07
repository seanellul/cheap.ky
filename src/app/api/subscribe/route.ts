import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSubscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const token = crypto.randomUUID();

    // ON CONFLICT DO NOTHING — don't reveal whether email already exists
    await db
      .insert(emailSubscribers)
      .values({ email, unsubscribeToken: token })
      .onConflictDoNothing({ target: emailSubscribers.email });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(unsubscribeHtml("Missing unsubscribe token."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const result = await db
    .update(emailSubscribers)
    .set({ verified: false })
    .where(eq(emailSubscribers.unsubscribeToken, token))
    .returning({ id: emailSubscribers.id });

  if (result.length === 0) {
    return new Response(unsubscribeHtml("Already unsubscribed or link expired."), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(unsubscribeHtml("You've been unsubscribed. You won't receive any more emails from us."), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

function unsubscribeHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>Unsubscribe - Cheap.ky</title></head>
<body style="margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f4;text-align:center;">
  <div style="max-width:400px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="margin:0 0 12px;font-size:20px;color:#1a7a7e;">Cheap.ky</h1>
    <p style="margin:0;color:#333;font-size:15px;line-height:1.5;">${message}</p>
    <a href="https://cheap.ky" style="display:inline-block;margin-top:20px;color:#1a7a7e;font-size:14px;">Back to Cheap.ky</a>
  </div>
</body>
</html>`;
}
