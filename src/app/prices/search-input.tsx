"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Search } from "lucide-react";

interface PriceSearchInputProps {
  defaultValue?: string;
  category?: string;
}

export function PriceSearchInput({
  defaultValue = "",
  category,
}: PriceSearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      if (category) params.set("category", category);
      const qs = params.toString();
      router.push(`/prices${qs ? `?${qs}` : ""}`);
    },
    [value, category, router]
  );

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products..."
        className="w-full rounded-xl border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
    </form>
  );
}
