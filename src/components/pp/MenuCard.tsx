"use client";

import { Star, Flame, Plus, Leaf, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart, type Extra } from "@/lib/cart-store";

export type MenuItemView = {
  id: string;
  name: string;
  description: string;
  longDescription?: string | null;
  price: number;
  rating: string | null;
  tags: string | null;
  isPopular: boolean;
  isSpicy: boolean;
  isHighProtein: boolean;
  extrasJson: string | null;
  imageUrl: string | null; // JSON: { emoji, color, image }
};

function parseImage(imageUrl: string | null): {
  emoji?: string;
  color?: [string, string];
  image?: string;
} {
  if (!imageUrl) return {};
  try {
    const p = JSON.parse(imageUrl);
    return { emoji: p.emoji, color: p.color, image: p.image };
  } catch {
    return {};
  }
}

function parseExtras(extrasJson: string | null): Extra[] {
  if (!extrasJson) return [];
  try {
    return JSON.parse(extrasJson);
  } catch {
    return [];
  }
}

function tagBadge(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("veg")) return <Leaf className="h-3 w-3" />;
  if (t.includes("protein")) return <Dumbbell className="h-3 w-3" />;
  if (t.includes("spicy") || t.includes("hot")) return <Flame className="h-3 w-3" />;
  return <Star className="h-3 w-3" />;
}

export function MenuCard({ item }: { item: MenuItemView }) {
  const { emoji, color, image } = parseImage(item.imageUrl);
  const extras = parseExtras(item.extrasJson);
  const { setOpenProduct } = useCart();

  const tags = item.tags ? item.tags.split(",").map((t) => t.trim()) : [];

  const open = () =>
    setOpenProduct({
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      longDescription: item.longDescription,
      basePrice: item.price,
      emoji,
      color,
      image,
      rating: item.rating,
      spicy: item.isSpicy,
      extras,
    });

  return (
    <article
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        item.isPopular && "ring-1 ring-primary/30"
      )}
      onClick={open}
    >
      {/* Image panel — real pizza photo when available, gradient+emoji fallback */}
      <div
        className="relative aspect-[5/4] w-full overflow-hidden"
        style={{
          background: color
            ? `linear-gradient(135deg, ${color[0]} 0%, ${color[1]} 100%)`
            : "linear-gradient(135deg, #FFE361, #E63420)",
        }}
      >
        <div className="absolute inset-0 pp-stripes opacity-25" />
        {item.isPopular && (
          <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-accent shadow">
            <Star className="h-3 w-3 fill-accent text-accent" /> Popular
          </div>
        )}
        {item.rating && (
          <div className="absolute right-3 top-3 z-20 rounded-md bg-ink/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cream">
            {item.rating}
          </div>
        )}
        {image ? (
          <img
            src={image}
            alt={`${item.name} — Detroit-Sicilian slice`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            width={500}
            height={400}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-7xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">
              {emoji ?? "🍕"}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight text-ink">{item.name}</h3>
          <div className="shrink-0 rounded-md bg-secondary/60 px-2 py-0.5 text-sm font-black text-ink">
            ${item.price.toFixed(2)}
          </div>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs text-foreground/65">
          {item.description}
        </p>
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground/70"
              >
                {tagBadge(t)} {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground">
            {extras.length > 0 ? `${extras.length} extras` : "Single-serve"}
          </span>
          <Button
            size="sm"
            className="h-8 gap-1 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </article>
  );
}
