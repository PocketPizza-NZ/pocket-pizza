"use client";

import { Clock, Flame, MapPin, Star } from "lucide-react";
import { useZone } from "@/lib/zone-store";

export function Hero() {
  const { location } = useZone();
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Marquee strip */}
      <div className="overflow-hidden border-b border-border/60 bg-ink py-1.5 text-cream">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em]">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex items-center gap-8">
              <span className="text-accent">★ 100% HALAL</span>
              <span>·</span>
              <span>Detroit-Sicilian Frico Crust</span>
              <span>·</span>
              <span className="text-primary">FROM $10</span>
              <span>·</span>
              <span>Open Fri · Sat · Sun</span>
              <span>·</span>
              <span className="text-accent">★ Auckland, NZ</span>
              <span>·</span>
              <span>Grab. Slide. Devour.</span>
              <span>·</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="grid items-center gap-6 md:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Flame className="h-3.5 w-3.5" />
              Auckland&apos;s only Halal Detroit-Sicilian
            </span>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl">
              Movie-named pies.
              <br />
              <span className="text-brand-gradient">Crispy frico edges.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-foreground/75 sm:text-lg">
              Thick Sicilian focaccia base + Detroit-style caramelised cheese
              crust. Single-serve rectangular pies, named after the movies we
              love. 100% halal, always.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-medium shadow-sm">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" /> 4.9 · 320+ reviews
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-medium shadow-sm">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {location
                  ? `${location.estimatedMins}–${location.estimatedMins + 10} min`
                  : "20–40 min"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-medium shadow-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {location ? location.addressLine : "210 New Windsor Rd"}
              </span>
            </div>
          </div>

          {/* Pizza "ticket" visual — uses real Mexican pizza image */}
          <div className="relative">
            <div
              className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border-4 border-ink bg-gradient-to-br from-primary via-primary to-[#FF3B1F] shadow-2xl"
              style={{ transform: "rotate(-2deg)" }}
            >
              <div className="absolute inset-0 pp-stripes opacity-30" />
              <picture>
                <source srcSet="/images/the-mexican.webp" type="image/webp" />
                <img
                  src="/images/the-mexican.png"
                  alt="The Mexican — 8-hour slow-cooked halal lamb birria Detroit-Sicilian slice"
                  className="absolute inset-0 h-full w-full object-cover"
                  width={800}
                  height={600}
                />
              </picture>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/60 to-transparent p-5 text-cream">
                <div className="inline-block rounded-md bg-accent px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-ink">
                  Now Showing
                </div>
                <div className="mt-1.5 font-black text-2xl leading-tight">
                  THE MEXICAN
                </div>
                <div className="text-sm font-semibold text-cream/85">
                  8-hour slow-cooked halal lamb birria
                </div>
                <div className="mt-2 inline-flex items-baseline gap-1 rounded-full bg-accent px-3 py-1 text-ink">
                  <span className="text-[10px] font-bold uppercase">From</span>
                  <span className="text-lg font-black">$16</span>
                </div>
              </div>
              {/* Ticket notches */}
              <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
              <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
