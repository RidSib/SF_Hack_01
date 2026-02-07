"use client";

import { motion } from "framer-motion";
import { Product } from "@/lib/types";

type Props = {
  product: Product;
  side: "left" | "right";
  highlighted?: boolean;
  onSelect?: () => void;
};

const CAT_COLORS: Record<string, string> = {
  electronics:
    "bg-indigo-500/20 text-indigo-300",
  fashion: "bg-pink-500/20 text-pink-300",
  kitchen: "bg-orange-500/20 text-orange-300",
  home: "bg-green-500/20 text-green-300",
  sports: "bg-purple-500/20 text-purple-300",
  shoe: "bg-pink-500/20 text-pink-300",
  shoes: "bg-pink-500/20 text-pink-300",
  clothing: "bg-pink-500/20 text-pink-300",
  accessories:
    "bg-amber-500/20 text-amber-300",
};

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

function placeholder(name: string): string {
  const label = encodeURIComponent(
    name.slice(0, 20)
  );
  return (
    "https://placehold.co/400x400" +
    `/1a1a2e/818cf8?text=${label}`
  );
}

function productImage(p: Product): string {
  if (!p.image_path) return placeholder(p.name);
  if (p.image_path.startsWith("http"))
    return p.image_path;
  // Relative path — try via API
  return `${API}/${p.image_path}`;
}

export default function ProductCard({
  product,
  side,
  highlighted,
  onSelect,
}: Props) {
  const cat = product.category?.toLowerCase();
  const catStyle =
    CAT_COLORS[cat] ??
    "bg-white/10 text-white/70";

  const tags = (
    product.attributes?.style_tags ?? []
  ) as string[];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        delay: side === "right" ? 0.1 : 0,
      }}
      onClick={onSelect}
      className={`group relative flex w-full max-w-sm cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all ${
        highlighted
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-white/10 hover:border-white/20"
      } bg-surface-light`}
    >
      {/* Image */}
      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-surface sm:h-56">
        {/* eslint-disable-next-line */}
        <img
          src={productImage(product)}
          alt={product.name}
          onError={(e) => {
            const t = e.currentTarget;
            const fb = placeholder(
              product.name
            );
            if (t.src !== fb) t.src = fb;
          }}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60 backdrop-blur-sm">
          {side}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${catStyle}`}
        >
          {product.category}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        {product.brand && (
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            {product.brand}
          </span>
        )}
        <h3 className="text-lg font-semibold leading-snug text-white">
          {product.name}
        </h3>
        {product.product_summary && (
          <p className="text-sm leading-relaxed text-white/50">
            {product.product_summary}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-2xl font-bold text-white">
            {product.price != null
              ? `$${product.price}`
              : "—"}
          </span>
          {product.material && (
            <span className="text-xs text-white/40">
              {product.material}
            </span>
          )}
        </div>

        {/* Color swatch + tags */}
        <div className="flex items-center gap-2 pt-1">
          {product.color && (
            <>
              <span
                className="h-3.5 w-3.5 rounded-full border border-white/20"
                style={{
                  backgroundColor:
                    product.color,
                }}
              />
              <span className="text-xs capitalize text-white/40">
                {product.color}
              </span>
            </>
          )}
          {tags.length > 0 && (
            <span className="ml-auto text-xs text-white/30">
              {tags.slice(0, 3).join(" · ")}
            </span>
          )}
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
        <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-surface">
          I like this one
        </span>
      </div>
    </motion.div>
  );
}
