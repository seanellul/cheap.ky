import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/lib/contexts/cart-context";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { BottomNav } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { HeaderCartBadge } from "@/components/header-cart-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cheap.ky — Compare Grocery Prices in Cayman Islands",
    template: "%s | Cheap.ky",
  },
  description:
    "Compare grocery prices across Cayman Islands stores. Find the cheapest prices at Foster's, Hurley's, Cost-U-Less, Priced Right & Kirk Market. Don't just shop — be Cheap.ky.",
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
  metadataBase: new URL("https://cheap.ky"),
  openGraph: {
    type: "website",
    locale: "en_KY",
    siteName: "Cheap.ky",
    title: "Cheap.ky — Compare Grocery Prices in Cayman Islands",
    description:
      "Compare prices across 5 Cayman grocery stores. Find the cheapest option for every product. Don't just shop — be Cheap.ky.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheap.ky — Cayman Grocery Price Comparison",
    description:
      "Compare grocery prices across Foster's, Hurley's, Cost-U-Less, Priced Right & Kirk Market.",
  },
  alternates: {
    canonical: "https://cheap.ky",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cheap.ky",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d7377",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Cheap.ky",
              url: "https://cheap.ky",
              description: "Compare grocery prices across Cayman Islands stores",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://cheap.ky/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
        <CartProvider>
          <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm">
            <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
              <a href="/" className="flex items-center gap-2">
                <BrandLogo />
              </a>
              <nav className="hidden md:flex items-center gap-6 text-sm">
                <a href="/" className="text-muted-foreground hover:text-primary transition-colors">Search</a>
                <a href="/prices" className="text-muted-foreground hover:text-primary transition-colors">Prices</a>
                <a href="/compare" className="text-muted-foreground hover:text-primary transition-colors">Compare</a>
                <a href="/report" className="text-muted-foreground hover:text-primary transition-colors">Report</a>
                <a href="/staples" className="text-muted-foreground hover:text-primary transition-colors">Staples</a>
                <a href="/cart" className="text-muted-foreground hover:text-primary transition-colors">Cart</a>
                <a href="/admin/ingest" className="text-muted-foreground hover:text-primary transition-colors">Admin</a>
                <HeaderCartBadge />
                <ThemeToggle />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
            {children}
          </main>
          <BottomNav />
          <Toaster />
        </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
