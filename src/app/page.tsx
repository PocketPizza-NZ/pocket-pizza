/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/pp/Header";
import { Hero } from "@/components/pp/Hero";
import { CategoryNav } from "@/components/pp/CategoryNav";
import { MenuCard, type MenuItemView } from "@/components/pp/MenuCard";
import { ProductSheet } from "@/components/pp/ProductSheet";
import { CartDrawer } from "@/components/pp/CartDrawer";
import { Footer } from "@/components/pp/Footer";
import { AdminDashboard } from "@/components/pp/AdminDashboard";
import { OrderTracking } from "@/components/pp/OrderTracking";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-store";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  menuItems: MenuItemView[];
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [trackRef, setTrackRef] = useState<string | null>(null);
  const { count, subtotal, setOpenCart, openCart, openProduct } = useCart();

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Open admin dashboard when:
  //  - host starts with "admin." (production: admin.pocketpizza.co.nz)
  //  - ?host=admin query param (sandbox testing)
  //  - ?admin=1 query param (legacy)
  // Open order tracking when ?track=PP-XXX (or ?track= for empty search) in URL
  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const isAdminHost =
      host.startsWith("admin.") || host === "admin" || params.get("host") === "admin";
    if (isAdminHost || params.get("admin") === "1") setAdminOpen(true);
    if (params.has("track")) setTrackRef(params.get("track") ?? "");
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      const ih =
        host.startsWith("admin.") || host === "admin" || p.get("host") === "admin";
      setAdminOpen(ih || p.get("admin") === "1");
      setTrackRef(p.has("track") ? (p.get("track") ?? "") : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const closeAdmin = () => {
    setAdminOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("admin");
    window.history.replaceState({}, "", url.toString());
  };

  const closeTracking = () => {
    setTrackRef(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("track");
    window.history.replaceState({}, "", url.toString());
  };

  const popular = categories
    .flatMap((c) => c.menuItems)
    .filter((m) => m.isPopular);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Hero />

      <CategoryNav
        categories={[
          ...(popular.length
            ? [{ id: "popular", slug: "popular", name: "★ Popular" }]
            : []),
          ...categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
        ]}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-8 sm:px-5">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Popular */}
            {popular.length > 0 && (
              <section id="cat-popular" className="scroll-mt-32">
                <SectionHeading
                  eyebrow="Now playing"
                  title="Popular this week"
                  subtitle="The pies our Auckland regulars keep coming back for."
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {popular.map((item) => (
                    <MenuCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Categories */}
            {categories.map((c) => (
              <section key={c.id} id={`cat-${c.slug}`} className="scroll-mt-32">
                <SectionHeading
                  eyebrow={`Section ${c.position}`}
                  title={c.name}
                  subtitle={c.description ?? undefined}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {c.menuItems.map((item) => (
                    <MenuCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}

            {/* CTA strip */}
            <section className="overflow-hidden rounded-3xl border-4 border-ink bg-gradient-to-r from-primary to-[#FF3B1F] p-7 text-cream sm:p-10">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-cream/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
                    Open Fri · Sat · Sun
                  </div>
                  <h3 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                    Grab. Slide. Devour.
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-cream/85">
                    Movie-named halal Detroit-Sicilian pies from $10. Delivered
                    across West & central Auckland.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="rounded-full bg-accent px-6 py-6 text-base font-black text-ink shadow-lg hover:bg-accent/90"
                  onClick={() => {
                    document
                      .getElementById("cat-popular")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Browse menu →
                </Button>
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer />

      {/* Floating cart pill on mobile (Uber Eats style) */}
      {count() > 0 && !openCart && !openProduct && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:hidden">
          <button
            onClick={() => setOpenCart(true)}
            className={cn(
              "mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-primary px-5 py-3.5 font-bold text-primary-foreground shadow-2xl transition active:scale-[0.98]"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-foreground/20 text-sm font-black">
                {count()}
              </span>
              View cart
            </span>
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4" /> ${subtotal().toFixed(2)}
            </span>
          </button>
        </div>
      )}

      <ProductSheet />
      <CartDrawer />

      {adminOpen && <AdminDashboard onClose={closeAdmin} />}

      {trackRef !== null && (
        <TrackingOverlay initialRef={trackRef} onClose={closeTracking} />
      )}
    </div>
  );
}

function TrackingOverlay({
  initialRef,
  onClose,
}: {
  initialRef: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-ink px-4 py-3 text-cream">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <div className="font-black leading-tight">Track your order</div>
            <div className="text-[10px] text-cream/70">Pocket Pizza NZ</div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-cream hover:bg-cream/10"
          onClick={onClose}
        >
          Back to menu
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <OrderTracking initialRef={initialRef || undefined} />
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </div>
      )}
      <h2 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-foreground/65">{subtitle}</p>}
    </div>
  );
}
