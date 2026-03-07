"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MissingProductButtonProps {
  variant?: "inline" | "block";
}

export function MissingProductButton({ variant = "block" }: MissingProductButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/product-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: trimmed }),
      });
      if (res.ok) {
        toast.success("Thanks! We'll look into adding that.");
        setName("");
        setOpen(false);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "inline" ? (
          <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
            Can&apos;t find a product?
          </button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <HelpCircle className="h-4 w-4 mr-1.5" />
            Can&apos;t find a product?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a product</DialogTitle>
          <DialogDescription>
            Tell us what you&apos;re looking for and we&apos;ll try to add it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="e.g. Grace Coconut Water"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            autoFocus
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={!name.trim() || submitting} size="sm">
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
