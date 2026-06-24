"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  categories: { id: string; slug: string; name: string }[];
};

export function CategoryNav({ categories }: Props) {
  const [active, setActive] = useState<string>(categories[0]?.slug ?? "");
  const navRef = useRef<HTMLDivElement>(null);

  // Scrollspy
  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(`cat-${c.slug}`))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const slug = visible.target.id.replace("cat-", "");
          setActive(slug);
        }
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  const scrollTo = (slug: string) => {
    const el = document.getElementById(`cat-${slug}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={navRef}
      className="sticky top-16 z-30 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto max-w-6xl px-3 sm:px-5">
        <div className="no-scrollbar flex gap-1 overflow-x-auto py-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => scrollTo(c.slug)}
              className={cn(
                "relative whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                active === c.slug
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
