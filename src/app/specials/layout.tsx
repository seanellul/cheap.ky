import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Specials & Deals",
  description: "Browse this week's grocery specials and deals across Cayman Islands stores. Sale prices updated daily from Foster's, Hurley's, Cost-U-Less, Priced Right & Kirk Market.",
};

export default function SpecialsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
