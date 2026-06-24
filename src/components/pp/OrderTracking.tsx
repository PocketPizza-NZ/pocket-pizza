"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  Pizza,
  Bike,
  Home,
  XCircle,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TrackedOrder = {
  reference: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  createdAt: string;
  paymentMethod: string;
  paymentLast4: string | null;
  paymentBrand: string | null;
  deliveryAddress: string;
  distanceKm: number | null;
  items: { name: string; quantity: number; lineTotal: number }[];
  customer: { fullName: string; maskedEmail: string; maskedMobile: string };
};

const STATUS_STEPS = [
  { key: "PAID", label: "Order received", icon: Receipt, description: "Payment confirmed" },
  { key: "PREPARING", label: "In the oven", icon: Pizza, description: "We're baking your pizza" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery", icon: Bike, description: "On the way to you" },
  { key: "DELIVERED", label: "Delivered", icon: Home, description: "Grab. Slide. Devour." },
];

function statusIndex(status: string): number {
  if (status === "CANCELLED") return -1;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function OrderTracking({ initialRef }: { initialRef?: string }) {
  const [reference, setReference] = useState(initialRef ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const lookup = async (ref?: string) => {
    const r = (ref ?? reference).trim();
    if (!r) {
      setError("Enter your order reference (e.g. PP-ABC123)");
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch(`/api/orders/track?reference=${encodeURIComponent(r.toUpperCase())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order not found");
      } else {
        setOrder(data);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-lookup if there's an initial reference (e.g. from order confirmation)
  useEffect(() => {
    if (initialRef) lookup(initialRef);
  }, [initialRef]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Search */}
      <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-lg">
        <h2 className="font-black text-2xl text-ink">Track your order</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Enter the reference from your order confirmation email or SMS.
        </p>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="PP-ABC123"
              className="pl-9 font-mono text-lg uppercase"
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              autoFocus
            />
          </div>
          <Button
            onClick={() => lookup()}
            disabled={loading || !reference}
            className="gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Track
          </Button>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {order && (
        <OrderResult order={order} />
      )}
    </div>
  );
}

function OrderResult({ order }: { order: TrackedOrder }) {
  const currentIdx = statusIndex(order.status);
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="space-y-4">
      {/* Reference + status header */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Order reference
            </div>
            <div className="font-mono text-2xl font-black text-primary">{order.reference}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Placed {new Date(order.createdAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
          <StatusPill status={order.status} />
        </div>
      </div>

      {/* Status tracker */}
      {!isCancelled ? (
        <div className="rounded-3xl border border-border bg-card p-6">
          <h3 className="mb-5 font-black text-lg">Order progress</h3>
          <ol className="relative space-y-6">
            {/* Vertical connector line */}
            <div
              className="absolute left-5 top-2 bottom-2 w-0.5 bg-border"
              aria-hidden="true"
            />
            {STATUS_STEPS.map((step, i) => {
              const isComplete = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isFuture = i > currentIdx;
              const Icon = step.icon;
              return (
                <li key={step.key} className="relative flex items-start gap-4">
                  <div
                    className={cn(
                      "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 bg-card",
                      isComplete && "border-primary bg-primary text-primary-foreground",
                      isCurrent && "border-primary bg-primary text-primary-foreground",
                      isFuture && "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <div
                      className={cn(
                        "font-bold",
                        isFuture ? "text-muted-foreground" : "text-ink"
                      )}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                    {isCurrent && (
                      <div className="mt-1 text-[11px] font-semibold text-primary">
                        ● In progress
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h3 className="mt-2 font-black text-lg">Order cancelled</h3>
          <p className="mt-1 text-sm text-foreground/70">
            This order was cancelled. If you didn&apos;t cancel it, please contact us with your reference.
          </p>
        </div>
      )}

      {/* Delivery + ETA */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Delivering to
          </div>
          <div className="mt-1 text-sm font-semibold">{order.deliveryAddress}</div>
          {order.distanceKm != null && (
            <div className="mt-1 text-xs text-muted-foreground">
              {order.distanceKm.toFixed(1)} km from our kitchen
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Payment
          </div>
          <div className="mt-1 text-sm font-semibold capitalize">
            {order.paymentMethod}
            {order.paymentBrand ? ` · ${order.paymentBrand.toUpperCase()}` : ""}
            {order.paymentLast4 ? ` · •••• ${order.paymentLast4}` : ""}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">${order.total.toFixed(2)} NZD</div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="mb-3 font-black text-lg">Your order</h3>
        <ul className="space-y-2 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                <span className="font-bold">{it.quantity}×</span> {it.name}
              </span>
              <span className="font-semibold">${it.lineTotal.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-sm">
          <div className="flex justify-between text-foreground/70">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-foreground/70">
            <span>Delivery</span>
            <span>${order.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-black">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Customer confirmation */}
      <div className="rounded-2xl bg-secondary/30 p-4 text-xs text-muted-foreground">
        Confirmation sent to <span className="font-semibold text-foreground">{order.customer.maskedEmail}</span> and{" "}
        <span className="font-semibold text-foreground">{order.customer.maskedMobile}</span>.
        Questions? Reply to your order SMS or email us at{" "}
        <a href="mailto:pocketpizzanz@gmail.com" className="font-semibold text-primary">
          pocketpizzanz@gmail.com
        </a>
        .
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    PAID: { bg: "bg-blue-100 text-blue-800", label: "Order received" },
    PREPARING: { bg: "bg-amber-100 text-amber-800", label: "In the oven" },
    OUT_FOR_DELIVERY: { bg: "bg-purple-100 text-purple-800", label: "Out for delivery" },
    DELIVERED: { bg: "bg-emerald-100 text-emerald-800", label: "Delivered" },
    CANCELLED: { bg: "bg-red-100 text-red-800", label: "Cancelled" },
  };
  const cfg = map[status] ?? { bg: "bg-muted text-foreground", label: status };
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide",
        cfg.bg
      )}
    >
      {cfg.label}
    </span>
  );
}
