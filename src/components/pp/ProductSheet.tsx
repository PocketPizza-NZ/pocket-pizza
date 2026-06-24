"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Star, Flame, Leaf, Dumbbell, ShoppingBag } from "lucide-react";
import { useState, useMemo } from "react";
import { useCart, type Extra } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ProductSheet() {
  const { openProduct, setOpenProduct, addLine } = useCart();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const total = useMemo(() => {
    if (!openProduct) return 0;
    const extrasSum = openProduct.extras
      .filter((e) => selected[e.id])
      .reduce((s, e) => s + e.price, 0);
    return (openProduct.basePrice + extrasSum) * qty;
  }, [openProduct, selected, qty]);

  const reset = () => {
    setQty(1);
    setSelected({});
  };

  const handleAdd = () => {
    if (!openProduct) return;
    const chosenExtras: Extra[] = openProduct.extras.filter((e) => selected[e.id]);
    addLine({
      menuItemId: openProduct.menuItemId,
      name: openProduct.name,
      basePrice: openProduct.basePrice,
      quantity: qty,
      extras: chosenExtras,
      emoji: openProduct.emoji,
      color: openProduct.color as [string, string] | undefined,
      image: openProduct.image,
      rating: openProduct.rating ?? null,
      spicy: openProduct.spicy,
    });
    toast.success(`${qty} × ${openProduct.name} added to cart`, {
      description: chosenExtras.length
        ? `Extras: ${chosenExtras.map((e) => e.name).join(", ")}`
        : undefined,
    });
    setOpenProduct(null);
    reset();
  };

  return (
    <Sheet
      open={!!openProduct}
      onOpenChange={(o) => {
        if (!o) reset();
        setOpenProduct(o ? openProduct : null);
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
      >
        {openProduct && (
          <>
            {/* Image hero — real photo when available */}
            <div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-b-3xl"
              style={{
                background: openProduct.color
                  ? `linear-gradient(135deg, ${openProduct.color[0]} 0%, ${openProduct.color[1]} 100%)`
                  : "linear-gradient(135deg, #FFE361, #E63420)",
              }}
            >
              <div className="absolute inset-0 pp-stripes opacity-30" />
              {openProduct.rating && (
                <div className="absolute left-4 top-4 z-20 inline-flex items-center gap-1 rounded-md bg-ink/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent">
                  {openProduct.rating}
                </div>
              )}
              {openProduct.image ? (
                <img
                  src={openProduct.image}
                  alt={openProduct.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  width={600}
                  height={450}
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="text-8xl drop-shadow-lg">{openProduct.emoji ?? "🍕"}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <SheetHeader className="space-y-2 px-0">
                <SheetTitle className="text-2xl font-black leading-tight">
                  {openProduct.name}
                </SheetTitle>
                <SheetDescription className="text-sm text-foreground/70">
                  {openProduct.longDescription ?? openProduct.description}
                </SheetDescription>
              </SheetHeader>

              {/* Tags */}
              {openProduct.spicy && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <Flame className="h-3 w-3" /> Spicy
                  </span>
                </div>
              )}

              {/* Extras */}
              {openProduct.extras.length > 0 && (
                <div className="mt-5">
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-foreground/80">
                    Make it yours
                  </h4>
                  <div className="space-y-1.5">
                    {openProduct.extras.map((e) => (
                      <label
                        key={e.id}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-xl border bg-card px-3 py-2.5 text-sm transition",
                          selected[e.id]
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={!!selected[e.id]}
                            onChange={(ev) =>
                              setSelected((s) => ({ ...s, [e.id]: ev.target.checked }))
                            }
                          />
                          <span className="font-medium">{e.name}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          +${e.price.toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-xl bg-secondary/30 p-3 text-xs text-foreground/70">
                <strong className="text-foreground">100% Halal.</strong> Detroit-Sicilian style with
                crispy frico edges. Single-serve rectangular pie served in our
                signature sliding box.
              </div>
            </div>

            <SheetFooter className="border-t bg-card px-5 py-3">
              <div className="flex items-center gap-3">
                {/* Qty stepper */}
                <div className="flex items-center rounded-full border border-border bg-background">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-7 text-center font-bold">{qty}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  className="flex-1 gap-2 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                  size="lg"
                  onClick={handleAdd}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Add · ${total.toFixed(2)}
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
