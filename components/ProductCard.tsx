"use client";

import { motion } from "framer-motion";
import { Product } from "@/lib/types";

type Props = {
  product: Product;
  side: "left" | "right";
  highlighted?: boolean;
  onSelect?: () => void;
};

const CATEGORY_COLORS: Record<string, string> = {
  electronics: "bg-indigo-500/20 text-indigo-300",
  fashion: "bg-pink-500/20 text-pink-300",
  kitchen: "bg-orange-500/20 text-orange-300",
  home: "bg-green-500/20 text-green-300",
  sports: "bg-purple-500/20 text-purple-300",
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= Math.round(rating)
              ? "text-yellow-400"
              : "text-white/20"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-white/50">
        {rating}
      </span>
    </div>
  );
}

export default function ProductCard({
  product,
  side,
  highlighted,
  onSelect,
}: Props) {
  const catStyle =
    CATEGORY_COLORS[product.category] ??
    "bg-white/10 text-white/70";

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
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Side label */}
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60 backdrop-blur-sm">
          {side}
        </span>
        {/* Category badge */}
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium ${catStyle}`}
        >
          {product.category}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold leading-snug text-white">
          {product.name}
        </h3>
        <p className="text-sm leading-relaxed text-white/50">
          {product.description}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-2xl font-bold text-white">
            ${product.price}
          </span>
          <Stars rating={product.rating} />
        </div>

        {/* Color swatch */}
        <div className="flex items-center gap-2 pt-1">
          <span
            className="h-3.5 w-3.5 rounded-full border border-white/20"
            style={{
              backgroundColor: product.color,
            }}
          />
          <span className="text-xs capitalize text-white/40">
            {product.color}
          </span>
        </div>
      </div>

      {/* Hover overlay label */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
        <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-surface">
          I like this one
        </span>
      </div>
    </motion.div>
  );
}
