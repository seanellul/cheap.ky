import { Resend } from "resend";
import type { PriceDrop } from "@/lib/blog/types";

export function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

export function buildDigestHtml(drops: PriceDrop[], unsubscribeUrl: string): string {
  const rows = drops
    .map(
      (d) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5;">
          <strong style="color: #1a1a1a;">${escapeHtml(d.productName)}</strong>
          <br />
          <span style="color: #666; font-size: 13px;">${escapeHtml(d.storeName)}</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e5e5; text-align: right; white-space: nowrap;">
          <span style="text-decoration: line-through; color: #999;">$${d.oldPrice.toFixed(2)}</span>
          <span style="color: #1a1a1a; font-weight: 600; margin-left: 6px;">$${d.newPrice.toFixed(2)}</span>
          <br />
          <span style="color: #1a8a3e; font-size: 13px; font-weight: 600;">Save $${d.dropAmount.toFixed(2)} (${d.dropPct}%)</span>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>This Week's Biggest Price Drops</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header -->
    <div style="background-color: #1a7a7e; padding: 24px 24px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">Cheap.ky</h1>
      <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">This Week's Biggest Price Drops</p>
    </div>

    <!-- Intro -->
    <div style="padding: 24px 24px 8px;">
      <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.5;">
        We found some deals for you this week. Here are the biggest price drops across Cayman's grocery stores:
      </p>
    </div>

    <!-- Price Drops Table -->
    <div style="padding: 8px 24px 24px;">
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f9f9f8;">
            <th style="padding: 10px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #666; border-bottom: 1px solid #e5e5e5;">Product</th>
            <th style="padding: 10px 16px; text-align: right; font-size: 13px; font-weight: 600; color: #666; border-bottom: 1px solid #e5e5e5;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="padding: 0 24px 32px; text-align: center;">
      <a href="https://cheap.ky" style="display: inline-block; background-color: #1a7a7e; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        See all prices on Cheap.ky
      </a>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 24px; background-color: #f9f9f8; border-top: 1px solid #e5e5e5; text-align: center;">
      <p style="margin: 0 0 8px; color: #666; font-size: 14px; font-weight: 600;">Shop Smart, Shop Cheap</p>
      <p style="margin: 0; color: #999; font-size: 12px;">
        You're getting this because you subscribed at cheap.ky.
        <br />
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
