"use client";

import { MapPin, Clock, Mail, Instagram, Facebook, ShieldCheck } from "lucide-react";
import { StoreMapEmbed } from "./DeliveryZonePicker";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
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
                <div className="font-black tracking-tight">POCKET PIZZA</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                  Halal · Detroit-Sicilian
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm text-cream/70">
              Auckland&apos;s only 100% halal Detroit-Sicilian fusion pizza.
              Thick focaccia base, crispy frico edges, premium local ingredients.
              Movie-named pies for the cinephile in you. Grab. Slide. Devour.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.instagram.com/pocketpizza_nz"
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 transition hover:bg-primary hover:text-primary-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                className="grid h-9 w-9 place-items-center rounded-full bg-cream/10 transition hover:bg-primary hover:text-primary-foreground"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>

            {/* Embedded Google Map */}
            <div className="mt-5">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                Find us
              </div>
              <StoreMapEmbed height={160} />
            </div>
          </div>

          {/* Visit */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">Visit</div>
            <div className="flex items-start gap-2 text-sm text-cream/80">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                210 New Windsor Road
                <br />
                New Windsor, Auckland
                <br />
                Aotearoa New Zealand
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-cream/80">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                Fri · 5–9pm
                <br />
                Sat · 5–9pm
                <br />
                Sun · 2–6pm
              </div>
            </div>
          </div>

          {/* Order */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">Order</div>
            <div className="flex items-start gap-2 text-sm text-cream/80">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <a href="mailto:pocketpizzanz@gmail.com" className="hover:text-accent">
                pocketpizzanz@gmail.com
              </a>
            </div>
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=210+New+Windsor+Road,+New+Windsor,+Auckland"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cream/20 px-3 py-1.5 text-xs font-bold transition hover:border-accent hover:text-accent"
            >
              <MapPin className="h-3.5 w-3.5" /> Get directions
            </a>
            <div className="mt-4 text-[11px] text-cream/60">
              <div className="mb-1 font-bold uppercase tracking-wider text-accent">
                We accept
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-cream/10 px-1.5 py-0.5 font-semibold">Stripe</span>
                <span className="rounded bg-cream/10 px-1.5 py-0.5 font-semibold">Windcave</span>
                <span className="rounded bg-cream/10 px-1.5 py-0.5 font-semibold">POLi</span>
                <span className="rounded bg-cream/10 px-1.5 py-0.5 font-semibold">Afterpay</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-cream/10 pt-5 text-[11px] text-cream/60 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Secure payments · Stripe / Windcave / POLi / Afterpay · NZ PCI-DSS & Privacy Act 2020
          </div>
          <div className="flex items-center gap-3">
            <a
              href="?track="
              onClick={(e) => {
                e.preventDefault();
                const url = new URL(window.location.href);
                url.searchParams.set("track", "");
                window.history.pushState({}, "", url.toString());
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              className="text-cream/60 underline-offset-2 hover:text-accent hover:underline"
              aria-label="Track your order"
            >
              Track order
            </a>
            <span>© {new Date().getFullYear()} Pocket Pizza NZ · Auckland · Aotearoa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
