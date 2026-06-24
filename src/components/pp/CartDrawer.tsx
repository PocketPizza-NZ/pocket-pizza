"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, X, MapPin, AlertCircle } from "lucide-react";
import { useCart, lineTotalOf } from "@/lib/cart-store";
import { useZone } from "@/lib/zone-store";
import { DeliveryZonePicker, MapEmbed } from "./DeliveryZonePicker";
import { CheckoutDialog } from "./CheckoutDialog";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { openCart, setOpenCart, lines, setQty, removeLine, subtotal, count, clear } = useCart();
  const { location } = useZone();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const deliveryFee = location?.isDeliverable ? location.deliveryFee : 0;
  const total = subtotal() + deliveryFee;
  const canCheckout = !!location?.isDeliverable;

  return (
    <>
      <Sheet open={openCart} onOpenChange={setOpenCart}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-ink px-5 py-4 text-cream">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-accent" />
              <SheetHeader className="space-y-0">
                <SheetTitle className="text-lg font-black text-cream">
                  Your Order
                </SheetTitle>
              </SheetHeader>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-cream hover:bg-cream/10"
              onClick={() => setOpenCart(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary/60">
                <ShoppingBag className="h-9 w-9 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Your cart is empty</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Add a Detroit-Sicilian pie to get started. Movie-named, halal, crispy frico edges.
              </p>
              <Button
                onClick={() => setOpenCart(false)}
                className="mt-2 rounded-full bg-primary font-bold text-primary-foreground"
              >
                Browse menu
              </Button>
            </div>
          ) : (
            <>
              {/* Delivery zone indicator */}
              <div className="border-b bg-secondary/30 px-5 py-3">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/60">
                  Delivering to
                </div>
                <DeliveryZonePicker variant="inline" />
                {location && (
                  <div className="mt-2 space-y-1.5">
                    {location.isDeliverable ? (
                      <>
                        <div className="flex items-center justify-between text-[11px] text-foreground/70">
                          <span>{location.distanceKm.toFixed(1)} km from store</span>
                          <span>· ~{location.estimatedMins} min</span>
                        </div>
                        <MapEmbed
                          lat={location.lat}
                          lng={location.lng}
                          label={location.addressLine}
                          height={120}
                        />
                      </>
                    ) : (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-[11px] text-destructive">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Outside delivery radius ({location.distanceKm.toFixed(1)} km away).
                          Switch to pickup, or choose a closer address.
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {!location && (
                  <p className="mt-1.5 text-[11px] text-primary">
                    Set a delivery address to see your fee & ETA
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <ul className="space-y-2">
                  {lines.map((line) => (
                    <li
                      key={line.key}
                      className="flex gap-3 rounded-2xl border border-border bg-card p-3"
                    >
                      <div
                        className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl"
                        style={{
                          background: line.color
                            ? `linear-gradient(135deg, ${line.color[0]}, ${line.color[1]})`
                            : "linear-gradient(135deg, #FFE361, #E63420)",
                        }}
                      >
                        {line.image ? (
                          <img
                            src={line.image}
                            alt={line.name}
                            className="h-full w-full object-cover"
                            width={64}
                            height={64}
                          />
                        ) : (
                          <span className="text-3xl">{line.emoji ?? "🍕"}</span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold leading-tight">{line.name}</div>
                            {line.extras.length > 0 && (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                {line.extras.map((e) => e.name).join(" · ")}
                              </div>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(line.key)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-border">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              onClick={() => setQty(line.key, line.quantity - 1)}
                              aria-label="Decrease"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-6 text-center text-sm font-bold">
                              {line.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full"
                              onClick={() => setQty(line.key, line.quantity + 1)}
                              aria-label="Increase"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="text-sm font-black text-primary">
                            ${lineTotalOf(line).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={clear}
                  className="mt-3 w-full rounded-full border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                >
                  Clear cart
                </button>
              </div>

              {/* Footer */}
              <SheetFooter className="border-t bg-card px-5 py-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-foreground/70">
                    <span>Subtotal</span>
                    <span>${subtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-foreground/70">
                    <span>
                      Delivery{" "}
                      {location ? `· ${location.distanceKm.toFixed(1)} km` : ""}
                    </span>
                    <span>
                      {location
                        ? location.isDeliverable
                          ? `$${deliveryFee.toFixed(2)}`
                          : "—"
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-border pt-2 text-base font-black">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className={cn(
                    "mt-3 w-full gap-2 rounded-full bg-primary py-6 text-base font-black text-primary-foreground shadow-md hover:bg-primary/90",
                    !canCheckout && "opacity-90"
                  )}
                  onClick={() => setCheckoutOpen(true)}
                  disabled={!canCheckout}
                >
                  {!location
                    ? "Set delivery address first"
                    : !location.isDeliverable
                    ? "Outside delivery zone — pickup only"
                    : `Checkout · $${total.toFixed(2)}`}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Secure checkout · Stripe / Windcave / POLi / Afterpay · NZ PCI-DSS aligned
                </p>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
}
