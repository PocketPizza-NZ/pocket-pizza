/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lock,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Loader2,
  TrendingUp,
  Package,
  Settings,
  Map,
  ShoppingBag,
  Power,
  LogOut,
  Bell,
  Volume2,
  Mic,
  RefreshCw,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Order = {
  id: string;
  reference: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentBrand: string | null;
  paymentLast4: string | null;
  deliveryAddress: string;
  distanceKm: number | null;
  createdAt: string;
  items: { id: string; name: string; quantity: number; lineTotal: number }[];
  customer: { fullName: string; email: string; mobile: string };
};

type MenuItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  price: number;
  rating: string | null;
  tags: string | null;
  isPopular: boolean;
  isSpicy: boolean;
  isHighProtein: boolean;
  imageUrl: string | null;
  extrasJson: string | null;
  categoryId: string;
  category: { id: string; name: string };
};

type Category = { id: string; slug: string; name: string };

type Zone = {
  id: string;
  name: string;
  region: string;
  postcode: string | null;
  fee: number;
  estimatedMins: number;
  isActive: boolean;
};

type Settings = {
  shopName: string;
  shopTagline: string;
  shopEmail: string;
  shopPhone: string | null;
  shopAddress: string;
  shopLat: number;
  shopLng: number;
  openingHours: string;
  baseFee: number;
  perKmAfter: number;
  freeRadiusKm: number;
  maxRadiusKm: number;
  estimatedMinsBase: number;
  estimatedMinsPerKm: number;
  instagramUrl: string | null;
  facebookUrl: string | null;
  stripePublishableKey: string | null;
};

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already authed (cookie)
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => {
        setAuthed(r.ok);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} onClose={onClose} />;
  }

  return <Dashboard onClose={onClose} onLogout={() => setAuthed(false)} />;
}

function LoginScreen({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      onSuccess();
      toast.success("Welcome back, admin");
    } else {
      toast.error("Wrong password");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background p-4">
      <div className="w-full max-w-sm rounded-3xl border-2 border-ink bg-card p-7 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-ink text-accent">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="font-black">Admin Dashboard</div>
              <div className="text-[11px] text-muted-foreground">Pocket Pizza NZ</div>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-xs font-semibold">Admin password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="mt-1"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Hint: check the <code className="rounded bg-muted px-1">ADMIN_PASSWORD</code> in your{" "}
              <code className="rounded bg-muted px-1">.env</code> file.
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-full bg-primary py-5 font-bold text-primary-foreground"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  onClose,
  onLogout,
}: {
  onClose: () => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState("orders");

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border bg-ink px-4 py-3 text-cream">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <div className="font-black leading-tight">Admin Dashboard</div>
            <div className="text-[10px] text-cream/70">Pocket Pizza NZ</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-cream hover:bg-cream/10"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-cream hover:bg-cream/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" /> Close
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="m-3 grid w-auto grid-cols-4 bg-secondary/40">
          <TabsTrigger value="orders" className="gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Orders
          </TabsTrigger>
          <TabsTrigger value="menu" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Menu
          </TabsTrigger>
          <TabsTrigger value="zones" className="gap-1.5">
            <Map className="h-3.5 w-3.5" /> Zones
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="m-0 flex-1 overflow-y-auto">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="menu" className="m-0 flex-1 overflow-y-auto">
          <MenuTab />
        </TabsContent>
        <TabsContent value="zones" className="m-0 flex-1 overflow-y-auto">
          <ZonesTab />
        </TabsContent>
        <TabsContent value="settings" className="m-0 flex-1 overflow-y-auto">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ──────────────────────────────────────────────── Voice + sound alert system
// Plays a chime + speaks "New order received" when new orders arrive.
// Uses the Web Speech API (built into all modern browsers — no deps).

function useNewOrderAlert() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  // Use a ref to avoid re-creating the polling interval every time lastAlertedId changes
  const lastAlertedIdRef = useRef<string | null>(null);
  const [recentAlert, setRecentAlert] = useState<string | null>(null);

  const triggerAlert = useCallback(
    (order: { reference: string; total: number; customer: { fullName: string }; items: { quantity: number; name: string }[] }) => {
      // 1. Play chime via Web Audio API (no asset file needed)
      if (soundEnabled) {
        try {
          const AudioCtx =
            window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          // Two-tone rising chime (E5 → A5) — pleasant, attention-grabbing
          const now = ctx.currentTime;
          const playTone = (freq: number, start: number, dur = 0.15) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + start);
            gain.gain.linearRampToValueAtTime(0.3, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + dur);
          };
          playTone(659.25, 0); // E5
          playTone(880.0, 0.15); // A5
          // Auto-close the audio context
          setTimeout(() => ctx.close(), 1000);
        } catch (e) {
          console.warn("Audio chime failed:", e);
        }
      }

      // 2. Speak "New order received. Reference PP-XXX, total $XX"
      if (speechEnabled && "speechSynthesis" in window) {
        const items = order.items
          .map((it) => `${it.quantity} ${it.name}`)
          .join(", ");
        const text = `New order received. Reference ${order.reference}. ${items}. Total ${order.total.toFixed(2)} dollars. Customer ${order.customer.fullName}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        // Try to use an English-speaking voice
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find((v) => v.lang.startsWith("en"));
        if (enVoice) utterance.voice = enVoice;
        window.speechSynthesis.cancel(); // Clear any queued speech
        window.speechSynthesis.speak(utterance);
      }

      // 3. Show on-screen alert banner (auto-dismiss after 8 sec)
      setRecentAlert(order.reference);
      setTimeout(() => setRecentAlert(null), 8000);
    },
    [soundEnabled, speechEnabled]
  );

  // Called by the polling hook when new orders are detected
  // Uses refs internally so it doesn't need to re-create every render
  const checkForNewOrders = useCallback(
    (orders: Order[], isFirstLoad: boolean) => {
      if (orders.length === 0) return;
      const newest = orders[0];
      if (isFirstLoad) {
        lastAlertedIdRef.current = newest.id;
        return;
      }
      const lastId = lastAlertedIdRef.current;
      if (lastId === null) {
        lastAlertedIdRef.current = newest.id;
        return;
      }
      // Find the index of the last alerted order — anything newer is "new"
      const lastIdx = orders.findIndex((o) => o.id === lastId);
      const newOrders = lastIdx === -1 ? orders : orders.slice(0, lastIdx);
      if (newOrders.length > 0) {
        // Alert on the newest
        triggerAlert(newOrders[0]);
        lastAlertedIdRef.current = newest.id;
      }
    },
    [triggerAlert]
  );

  return {
    soundEnabled,
    setSoundEnabled,
    speechEnabled,
    setSpeechEnabled,
    checkForNewOrders,
    recentAlert,
  };
}

// ──────────────────────────────────────────────── Orders Tab
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const {
    soundEnabled,
    setSoundEnabled,
    speechEnabled,
    setSpeechEnabled,
    checkForNewOrders,
    recentAlert,
  } = useNewOrderAlert();
  const isFirstLoadRef = useRef(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    const newOrders = data.orders ?? [];
    setOrders(newOrders);
    setLastUpdate(new Date());
    // Check for new orders (skip on first load to avoid spamming alerts)
    checkForNewOrders(newOrders, isFirstLoadRef.current);
    isFirstLoadRef.current = false;
    setLoading(false);
  }, [checkForNewOrders]);

  useEffect(() => {
    load();
    // Poll for new orders every 20 seconds
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
      credentials: "include",
    });
    toast.success(`Status → ${status}`);
    load();
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading orders…</div>;

  // Floating alert banner (top-right) — appears when a new order arrives
  const newOrder = recentAlert
    ? orders.find((o) => o.reference === recentAlert)
    : null;

  return (
    <>
      {/* New order alert banner */}
      {newOrder && (
        <div className="fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] animate-in slide-in-from-top-2 rounded-2xl border-2 border-primary bg-card p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-primary">🔔 New order!</div>
              <div className="font-mono text-xs font-bold">{newOrder.reference}</div>
              <div className="text-xs text-foreground/70">
                {newOrder.items.reduce((s, i) => s + i.quantity, 0)} item(s) · ${newOrder.total.toFixed(2)} NZD
              </div>
              <div className="text-xs text-muted-foreground">
                {newOrder.customer.fullName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert controls + last-updated timestamp */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {lastUpdate
              ? `Updated ${lastUpdate.toLocaleTimeString("en-NZ")}`
              : "Loading…"}
          </span>
          <span className="text-muted-foreground">· Auto-refresh 20s</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition",
              soundEnabled
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
            aria-label="Toggle chime"
          >
            <Volume2 className="h-3.5 w-3.5" />
            Chime {soundEnabled ? "on" : "off"}
          </button>
          <button
            onClick={() => setSpeechEnabled((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition",
              speechEnabled
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
            aria-label="Toggle voice"
          >
            <Mic className="h-3.5 w-3.5" />
            Voice {speechEnabled ? "on" : "off"}
          </button>
          <button
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 font-semibold border border-border hover:border-primary/40"
            aria-label="Refresh now"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-2 h-10 w-10 opacity-40" />
          No orders yet.
        </div>
      ) : (
        <OrdersList
          orders={orders}
          updateStatus={updateStatus}
        />
      )}
    </>
  );
}

function OrdersList({
  orders,
  updateStatus,
}: {
  orders: Order[];
  updateStatus: (id: string, status: string) => void;
}) {

  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total orders" value={orders.length.toString()} />
        <Stat label="Revenue" value={`$${totalRevenue.toFixed(2)}`} />
        <Stat
          label="Avg order"
          value={`$${orders.length ? (totalRevenue / orders.length).toFixed(2) : "0.00"}`}
        />
      </div>

      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-primary">{o.reference}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {new Date(o.createdAt).toLocaleString("en-NZ", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black">${o.total.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {o.paymentMethod}
                  {o.paymentBrand ? ` · ${o.paymentBrand.toUpperCase()}` : ""}
                  {o.paymentLast4 ? ` · •••• ${o.paymentLast4}` : ""}
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Customer
                </div>
                <div className="text-sm font-medium">{o.customer.fullName}</div>
                <div className="text-xs text-muted-foreground">{o.customer.email}</div>
                <div className="text-xs text-muted-foreground">{o.customer.mobile}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Delivery
                </div>
                <div className="text-xs">{o.deliveryAddress}</div>
                {o.distanceKm != null && (
                  <div className="text-[11px] text-muted-foreground">
                    {o.distanceKm.toFixed(1)} km · ${o.deliveryFee.toFixed(2)} fee
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Items
              </div>
              <ul className="mt-1 space-y-0.5 text-sm">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>
                      {it.quantity} × {it.name}
                    </span>
                    <span className="font-semibold">${it.lineTotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={o.status === s ? "default" : "outline"}
                  className={cn(
                    "h-7 px-2.5 text-[11px] font-bold",
                    o.status === s
                      ? "bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                  onClick={() => updateStatus(o.id, s)}
                >
                  {s.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-xl font-black">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-blue-100 text-blue-800",
    PREPARING: "bg-amber-100 text-amber-800",
    OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
        map[status] ?? "bg-muted text-foreground"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ──────────────────────────────────────────────── Menu Tab
function MenuTab() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/menu", { credentials: "include" });
    const data = await res.json();
    setItems(data.items ?? []);
    // Pull categories from the menu API (included in admin response)
    const cats = (data.items ?? []).reduce<Category[]>((acc, it) => {
      if (it.category && !acc.find((c) => c.id === it.category.id)) {
        acc.push(it.category);
      }
      return acc;
    }, []);
    setCategories(cats);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading menu…</div>;

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black">Menu items</h3>
          <p className="text-xs text-muted-foreground">
            Edit prices, images, descriptions, extras, or add new items.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="gap-1.5 rounded-full bg-primary font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((it) => {
          const img = parseImage(it.imageUrl);
          return (
            <div key={it.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl"
                style={{
                  background: img.color
                    ? `linear-gradient(135deg, ${img.color[0]}, ${img.color[1]})`
                    : "linear-gradient(135deg, #FFE361, #E63420)",
                }}
              >
                {img.image ? (
                  <img
                    src={img.image}
                    alt={it.name}
                    className="h-full w-full object-cover"
                    width={64}
                    height={64}
                  />
                ) : (
                  <span className="text-2xl">{img.emoji ?? "🍕"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-bold leading-tight">{it.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {it.category.name} · {it.slug}
                    </div>
                  </div>
                  <div className="font-black text-primary">${it.price.toFixed(2)}</div>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-foreground/70">{it.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {it.isPopular && <Badge variant="secondary" className="text-[10px]">Popular</Badge>}
                  {it.isSpicy && <Badge variant="destructive" className="text-[10px]">Spicy</Badge>}
                  {it.isHighProtein && <Badge variant="outline" className="text-[10px]">High protein</Badge>}
                  {it.tags && it.tags.split(",").map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t.trim()}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditing(it)}
                  aria-label="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <DeleteButton
                  endpoint={`/api/admin/menu/${it.id}`}
                  label={it.name}
                  onDeleted={load}
                />
              </div>
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <MenuItemEditor
          item={editing}
          categories={categories}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function parseImage(imageUrl: string | null) {
  if (!imageUrl) return {};
  try {
    return JSON.parse(imageUrl);
  } catch {
    return {};
  }
}

function MenuItemEditor({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: MenuItem | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    slug: item?.slug ?? "",
    description: item?.description ?? "",
    longDescription: item?.longDescription ?? "",
    price: item?.price ?? 10,
    rating: item?.rating ?? "",
    tags: item?.tags ?? "",
    isPopular: item?.isPopular ?? false,
    isSpicy: item?.isSpicy ?? false,
    isHighProtein: item?.isHighProtein ?? false,
    categoryId: item?.categoryId ?? categories[0]?.id ?? "",
    position: item?.position ?? 0,
    // Image JSON (we edit emoji + color + image path)
    emoji: parseImage(item?.imageUrl ?? null).emoji ?? "",
    color1: parseImage(item?.imageUrl ?? null).color?.[0] ?? "#FFE361",
    color2: parseImage(item?.imageUrl ?? null).color?.[1] ?? "#E63420",
    image: parseImage(item?.imageUrl ?? null).image ?? "",
    extras: item?.extrasJson ?? "[]",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const imageUrl = JSON.stringify({
      emoji: form.emoji || undefined,
      color: [form.color1, form.color2],
      image: form.image || undefined,
    });
    const payload = {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: form.description,
      longDescription: form.longDescription || null,
      price: Number(form.price),
      rating: form.rating || null,
      tags: form.tags || null,
      isPopular: form.isPopular,
      isSpicy: form.isSpicy,
      isHighProtein: form.isHighProtein,
      categoryId: form.categoryId,
      position: Number(form.position),
      extrasJson: form.extras,
      imageUrl,
    };
    const url = item ? `/api/admin/menu/${item.id}` : "/api/admin/menu";
    const method = item ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    setSaving(false);
    if (res.ok) {
      toast.success(item ? "Item updated" : "Item created");
      onSaved();
    } else {
      toast.error("Save failed");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="border-b bg-ink px-5 py-3.5 text-cream">
          <DialogTitle className="text-base font-black text-cream">
            {item ? "Edit menu item" : "New menu item"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-cream/70">
            Changes are live immediately on the storefront.
          </DialogDescription>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Slug">
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-from-name" />
            </Field>
          </div>

          <Field label="Description (short)">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          <Field label="Long description (optional)">
            <Textarea
              value={form.longDescription}
              onChange={(e) => setForm({ ...form, longDescription: e.target.value })}
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Price (NZD)">
              <Input
                type="number"
                step="0.50"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
              />
            </Field>
            <Field label="Rating tag">
              <Input value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="G · CLASSIC" />
            </Field>
            <Field label="Position">
              <Input
                type="number"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tags (comma-separated)">
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Vegetarian, Classic" />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-3">
            <Toggle label="Popular" checked={form.isPopular} onChange={(v) => setForm({ ...form, isPopular: v })} />
            <Toggle label="Spicy" checked={form.isSpicy} onChange={(v) => setForm({ ...form, isSpicy: v })} />
            <Toggle label="High protein" checked={form.isHighProtein} onChange={(v) => setForm({ ...form, isHighProtein: v })} />
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
              Image
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Image path (e.g. /images/the-mexican.webp)">
                <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/your-pizza.webp" />
              </Field>
              <Field label="Fallback emoji (when no image)">
                <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🍕" maxLength={4} />
              </Field>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label="Gradient color 1">
                <Input type="color" value={form.color1} onChange={(e) => setForm({ ...form, color1: e.target.value })} className="h-10 p-1" />
              </Field>
              <Field label="Gradient color 2">
                <Input type="color" value={form.color2} onChange={(e) => setForm({ ...form, color2: e.target.value })} className="h-10 p-1" />
              </Field>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Upload new images to <code className="rounded bg-muted px-1">/public/images/</code> via your hosting provider, then reference them above.
            </div>
          </div>

          <Field label="Extras (JSON array)" hint='[{"id":"extra-cheese","name":"Extra Cheese","price":2}]'>
            <Textarea
              value={form.extras}
              onChange={(e) => setForm({ ...form, extras: e.target.value })}
              rows={3}
              className="font-mono text-xs"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-card p-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving || !form.name}
            className="gap-1.5 rounded-full bg-primary font-bold text-primary-foreground"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────── Zones Tab
function ZonesTab() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/zones", { credentials: "include" });
    const data = await res.json();
    setZones(data.zones ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (z: Zone) => {
    await fetch(`/api/admin/zones/${z.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !z.isActive }),
      credentials: "include",
    });
    load();
  };

  const updateFee = async (z: Zone, fee: number) => {
    await fetch(`/api/admin/zones/${z.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fee }),
      credentials: "include",
    });
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading zones…</div>;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-black">Delivery zones</h3>
        <p className="text-xs text-muted-foreground">
          Note: most deliveries use the dynamic Google Maps distance fee configured in{" "}
          <strong>Settings</strong>. Zones here are the legacy flat-fee list — toggle them on/off or
          adjust the flat fee.
        </p>
      </div>

      <div className="space-y-2">
        {zones.map((z) => (
          <div key={z.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <Power className={cn("h-5 w-5", z.isActive ? "text-primary" : "text-muted-foreground")} />
            <div className="flex-1">
              <div className="font-bold">{z.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {z.region} · {z.postcode ?? "—"} · ~{z.estimatedMins} min
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.50"
                defaultValue={z.fee}
                onBlur={(e) => updateFee(z, parseFloat(e.target.value) || 0)}
                className="h-8 w-20"
              />
            </div>
            <Switch checked={z.isActive} onCheckedChange={() => toggle(z)} />
            <DeleteButton endpoint={`/api/admin/zones/${z.id}`} label={z.name} onDeleted={load} />
          </div>
        ))}
      </div>

      <NewZoneForm onSaved={load} />
    </div>
  );
}

function NewZoneForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [postcode, setPostcode] = useState("");
  const [fee, setFee] = useState(5);
  const [mins, setMins] = useState(30);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, postcode: postcode || null, fee, estimatedMins: mins }),
      credentials: "include",
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Added zone ${name}`);
      setName("");
      setPostcode("");
      setFee(5);
      setMins(30);
      onSaved();
    } else {
      toast.error("Failed to add zone");
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-card p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground/80">
        Add new zone
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
        <Input
          type="number"
          step="0.50"
          placeholder="Fee"
          value={fee}
          onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
        />
        <Input
          type="number"
          placeholder="Mins"
          value={mins}
          onChange={(e) => setMins(parseInt(e.target.value) || 30)}
        />
      </div>
      <Button
        onClick={save}
        disabled={saving || !name}
        className="mt-2 gap-1.5 rounded-full bg-primary font-bold text-primary-foreground"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add zone
      </Button>
    </div>
  );
}

// ──────────────────────────────────────────────── Settings Tab
function SettingsTab() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setS(d.settings));
  }, []);

  if (!s) return <div className="p-6 text-center text-muted-foreground">Loading settings…</div>;

  const set = (patch: Partial<Settings>) => setS({ ...s, ...patch });

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
      credentials: "include",
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved");
    else toast.error("Save failed");
  };

  // Parse opening hours for editing
  let hours: Record<string, string> = {};
  try {
    hours = JSON.parse(s.openingHours);
  } catch {
    hours = {};
  }
  const setHour = (day: string, value: string) => {
    const next = { ...hours, [day]: value };
    set({ openingHours: JSON.stringify(next) });
  };

  return (
    <div className="space-y-5 p-4">
      {/* Shop identity */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 font-black">Shop identity</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Shop name">
            <Input value={s.shopName} onChange={(e) => set({ shopName: e.target.value })} />
          </Field>
          <Field label="Tagline">
            <Input value={s.shopTagline} onChange={(e) => set({ shopTagline: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={s.shopEmail} onChange={(e) => set({ shopEmail: e.target.value })} />
          </Field>
          <Field label="Phone (optional)">
            <Input value={s.shopPhone ?? ""} onChange={(e) => set({ shopPhone: e.target.value })} />
          </Field>
          <Field label="Instagram URL">
            <Input value={s.instagramUrl ?? ""} onChange={(e) => set({ instagramUrl: e.target.value })} />
          </Field>
          <Field label="Facebook URL">
            <Input value={s.facebookUrl ?? ""} onChange={(e) => set({ facebookUrl: e.target.value })} />
          </Field>
        </div>
      </section>

      {/* Address */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 font-black">Shop address</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          This is the origin point for all delivery distance calculations. Changing the lat/lng will
          update the delivery fees for every customer.
        </p>
        <div className="grid gap-3">
          <Field label="Address">
            <Textarea value={s.shopAddress} onChange={(e) => set({ shopAddress: e.target.value })} rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" hint="Lookup via Google Maps → right-click → coordinates">
              <Input
                type="number"
                step="0.0001"
                value={s.shopLat}
                onChange={(e) => set({ shopLat: parseFloat(e.target.value) })}
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="0.0001"
                value={s.shopLng}
                onChange={(e) => set({ shopLng: parseFloat(e.target.value) })}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Opening hours */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 font-black">Opening hours</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Enter the hours for each day, or &quot;Closed&quot;. Shown in the footer of the storefront.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
            <Field key={d} label={d.toUpperCase()}>
              <Input
                value={hours[d] ?? ""}
                onChange={(e) => setHour(d, e.target.value)}
                placeholder="Closed"
              />
            </Field>
          ))}
        </div>
      </section>

      {/* Delivery rules */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 font-black">Delivery rules</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          These power the dynamic fee calculator. Customers outside the max radius will be told to
          choose pickup instead.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Base fee (NZD)" hint="Within free radius">
            <Input
              type="number"
              step="0.50"
              value={s.baseFee}
              onChange={(e) => set({ baseFee: parseFloat(e.target.value) })}
            />
          </Field>
          <Field label="Per-km fee (NZD)" hint="Beyond free radius">
            <Input
              type="number"
              step="0.10"
              value={s.perKmAfter}
              onChange={(e) => set({ perKmAfter: parseFloat(e.target.value) })}
            />
          </Field>
          <Field label="Free radius (km)">
            <Input
              type="number"
              step="0.5"
              value={s.freeRadiusKm}
              onChange={(e) => set({ freeRadiusKm: parseFloat(e.target.value) })}
            />
          </Field>
          <Field label="Max radius (km)" hint="Hard cutoff — beyond this = pickup only">
            <Input
              type="number"
              step="1"
              value={s.maxRadiusKm}
              onChange={(e) => set({ maxRadiusKm: parseFloat(e.target.value) })}
            />
          </Field>
          <Field label="ETA base (min)">
            <Input
              type="number"
              value={s.estimatedMinsBase}
              onChange={(e) => set({ estimatedMinsBase: parseInt(e.target.value) })}
            />
          </Field>
          <Field label="ETA per km (min)">
            <Input
              type="number"
              step="0.1"
              value={s.estimatedMinsPerKm}
              onChange={(e) => set({ estimatedMinsPerKm: parseFloat(e.target.value) })}
            />
          </Field>
        </div>
      </section>

      {/* Stripe */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 font-black">Stripe</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Set your Stripe publishable key here (overrides <code className="rounded bg-muted px-1">.env</code>).
          The secret key stays in <code className="rounded bg-muted px-1">.env</code> for security.
        </p>
        <Field label="Stripe publishable key (pk_...)">
          <Input
            value={s.stripePublishableKey ?? ""}
            onChange={(e) => set({ stripePublishableKey: e.target.value })}
            placeholder="pk_live_... or pk_test_..."
          />
        </Field>
      </section>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background p-3">
        <Button
          onClick={save}
          disabled={saving}
          className="gap-1.5 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-md"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save all settings
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────── shared
function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
      {error ? (
        <div className="mt-1 text-[11px] text-destructive">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function DeleteButton({
  endpoint,
  label,
  onDeleted,
}: {
  endpoint: string;
  label: string;
  onDeleted: () => void;
}) {
  const handle = async () => {
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
    const res = await fetch(endpoint, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Deleted");
      onDeleted();
    } else {
      toast.error("Delete failed");
    }
  };
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onClick={handle}
      aria-label="Delete"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
