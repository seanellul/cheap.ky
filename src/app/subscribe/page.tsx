import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SubscribeForm } from "@/components/subscribe-form";

export const metadata: Metadata = {
  title: "Get the Best Deals in Your Inbox - Cheap.ky",
  description:
    "Subscribe to the Cheap.ky weekly digest and get the biggest grocery price drops in the Cayman Islands delivered to your inbox every Friday.",
  alternates: {
    canonical: "https://cheap.ky/subscribe",
  },
};

export default function SubscribePage() {
  return (
    <div className="space-y-8">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Subscribe</span>
      </nav>

      <div className="max-w-lg mx-auto text-center space-y-6 py-8 sm:py-16">
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Get the best deals in your inbox
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Every Friday, we&apos;ll send you the biggest price drops across
            Cayman&apos;s grocery stores. No spam, just savings.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <SubscribeForm />
        </div>

        <p className="text-xs text-muted-foreground">
          Unsubscribe anytime with one click. We never share your email.
        </p>
      </div>
    </div>
  );
}
