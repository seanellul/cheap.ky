import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { CartProvider } from "@/lib/contexts/cart-context";
import { FavouritesProvider } from "@/lib/contexts/favourites-context";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { PostHogProvider } from "@/lib/contexts/posthog-provider";
import { PostHogPageView } from "@/lib/contexts/posthog-provider";
import { Suspense } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { AppBanner } from "@/components/app-banner";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { HeaderCartBadge } from "@/components/header-cart-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { NavLink } from "@/components/nav-link";
import { MobileMenu } from "@/components/mobile-menu";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Cheap.ky — Shop Smart, Shop Cheap",
    template: "%s | Cheap.ky",
  },
  description:
    "Save up to 75% across 35k Cayman grocery products. Compare prices at Foster's, Hurley's & Cost-U-Less. Don't just shop, be Cheap.ky.",
  keywords: [
    "Cayman Islands grocery prices",
    "cheap groceries Cayman",
    "Foster's prices",
    "Hurley's prices",
    "Cost-U-Less Cayman",
    "Priced Right Cayman",
    "Kirk Market prices",
    "Grand Cayman supermarket",
    "grocery comparison Cayman",
    "cheapest groceries Grand Cayman",
    "Cayman food prices",
    "save money groceries Cayman",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  metadataBase: new URL("https://www.cheap.ky"),
  openGraph: {
    type: "website",
    locale: "en_KY",
    siteName: "Cheap.ky",
    title: "Cheap.ky — Shop Smart, Shop Cheap",
    description:
      "Save up to 75% across 35k Cayman grocery products. Don't just shop, be Cheap.ky",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheap.ky — Shop Smart, Shop Cheap",
    description:
      "Save up to 75% across 35k Cayman grocery products. Don't just shop, be Cheap.ky",
  },
  alternates: {
    canonical: "https://www.cheap.ky",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cheap.ky",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a7a7e",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()` }} />
        <script dangerouslySetInnerHTML={{ __html: `if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js")})}` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "Cheap.ky",
                url: "https://cheap.ky",
                description:
                  "Compare grocery prices across all Cayman Islands supermarkets. Track real-time prices from Foster's, Hurley's, Cost-U-Less, Priced Right & Shopright. 48,000+ products updated daily.",
                potentialAction: {
                  "@type": "SearchAction",
                  target: "https://cheap.ky/?q={search_term_string}",
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "Cheap.ky",
                url: "https://cheap.ky",
                logo: "https://cheap.ky/favicon.svg",
                description:
                  "Cheap.ky is the Cayman Islands' only independent grocery price comparison platform. It tracks real-time prices across all major supermarkets in Grand Cayman so residents and visitors can find the cheapest groceries instantly.",
                foundingDate: "2025",
                slogan: "Don't just shop — be Cheap.ky",
                areaServed: {
                  "@type": "Place",
                  name: "Cayman Islands",
                  geo: { "@type": "GeoCoordinates", latitude: 19.3133, longitude: -81.2546 },
                },
                knowsAbout: [
                  "Grocery prices in the Cayman Islands",
                  "Cost of living in the Cayman Islands",
                  "Cayman Islands supermarket comparison",
                  "Food prices in Grand Cayman",
                  "Saving money on groceries in Cayman",
                  "Cayman Islands lifestyle and daily expenses",
                  "Foster's Food Fair",
                  "Hurley's Marketplace",
                  "Cost-U-Less Cayman",
                  "Priced Right Cayman",
                  "Shopright Cayman",
                ],
                contactPoint: {
                  "@type": "ContactPoint",
                  email: "hello@cheap.ky",
                  contactType: "customer support",
                },
              },
            ]),
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${plusJakarta.variable} antialiased`}
      >
        <PostHogProvider>
        <Suspense fallback={null}><PostHogPageView /></Suspense>
        <ThemeProvider>
        <CartProvider>
        <FavouritesProvider>
          <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl backdrop-saturate-150">
            <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-2.5 md:py-3">
              <a href="/" className="flex items-center gap-2 active:scale-95 transition-transform">
                <BrandLogo showIcon />
              </a>
              {/* Mobile header actions */}
              <div className="flex items-center gap-1 md:hidden">
                <MobileMenu />
              </div>
              <nav className="hidden md:flex items-center gap-1 text-sm">
                <NavLink href="/">Search</NavLink>
                <NavLink href="/compare">Compare</NavLink>
                <NavLink href="/report">Report</NavLink>
                <NavLink href="/staples">Staples</NavLink>
                <NavLink href="/blog">Blog</NavLink>
                <NavLink href="/guides/grocery-prices-cayman-islands-2026">Guides</NavLink>
                <NavLink href="/analytics">Analytics</NavLink>
                <NavLink href="/favourites">Favourites</NavLink>
                <NavLink href="/cart">Cart</NavLink>
                <NavLink href="/history">History</NavLink>
                <HeaderCartBadge />
                <ThemeToggle />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:py-6 md:pb-6">
            {children}
          </main>
          <AppBanner />
          <PWAInstallPrompt />
          <BottomNav />
          <Toaster />
        </FavouritesProvider>
        </CartProvider>
        </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
