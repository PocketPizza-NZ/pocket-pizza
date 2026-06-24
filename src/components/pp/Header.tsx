"use client";

import { ShoppingBag, Flame, Utensils } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useZone } from "@/lib/zone-store";
import { Button } from "@/components/ui/button";
import { DeliveryZonePicker } from "./DeliveryZonePicker";
import { cn } from "@/lib/utils";

export function Header() {
  const { count, setOpenCart } = useCart();
  const { location } = useZone();

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/80 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/80"
      style={{ background: "color-mix(in oklab, var(--background) 92%, transparent)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:px-5">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <picture>
            <source srcSet="/images/pocket-pizza-logo.webp" type="image/webp" />
            <img
              src="/images/pocket-pizza-logo.png"
              alt="Pocket Pizza NZ"
              className="h-11 w-auto"
              width={150}
              height={36}
            />
          </picture>
          <div className="leading-tight">
            <div
              className="font-black tracking-tight text-ink"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              POCKET PIZZA
            </div>
            <div className="-mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Halal · Detroit-Sicilian
            </div>
          </div>
        </a>

        {/* Centre: delivery zone */}
        <div className="hidden flex-1 justify-center md:flex">
          <DeliveryZonePicker variant="header" />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://www.pocketpizza.co.nz/#hours"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/50 hover:text-primary sm:inline-flex"
          >
            <Utensils className="h-3.5 w-3.5" /> Open Fri–Sun
          </a>

          <Button
            size="sm"
            onClick={() => setOpenCart(true)}
            className={cn(
              "relative h-10 gap-2 rounded-full px-4 font-semibold shadow-sm",
              count() > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-ink text-cream hover:bg-ink/90"
            )}
            aria-label={`Cart with ${count()} items`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {count() > 0 && (
              <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-black text-accent-foreground">
                {count()}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile delivery picker */}
      <div className="border-t border-border/60 px-3 py-2 md:hidden">
        <DeliveryZonePicker variant="header" />
      </div>

      {/* No-zone notice */}
      {!location && (
        <div className="bg-secondary/40 px-3 py-1 text-center text-[11px] text-muted-foreground">
          Set your delivery address to see fees & ETA · Search any address worldwide
        </div>
      )}
    </header>
  );
}
