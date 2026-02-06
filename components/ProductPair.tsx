"use client";

import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "./ProductCard";
import { useShop } from "@/context/ShopContext";

export default function ProductPair() {
  const {
    displayedProducts,
    highlightedId,
    send,
  } = useShop();

  if (displayedProducts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-20 text-center"
      >
        <div className="text-6xl">🛍️</div>
        <p className="max-w-xs text-lg text-white/40">
          Tell me what you&apos;re looking for
          and I&apos;ll find the perfect match
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-col items-stretch justify-center gap-6 px-4 sm:flex-row">
      <AnimatePresence mode="popLayout">
        {displayedProducts[0] && (
          <ProductCard
            key={displayedProducts[0].id}
            product={displayedProducts[0]}
            side="left"
            highlighted={
              highlightedId ===
              displayedProducts[0].id
            }
            onSelect={() =>
              send(
                `I like the left one — ${displayedProducts[0].name}`
              )
            }
          />
        )}
      </AnimatePresence>

      {/* VS divider */}
      {displayedProducts.length === 2 && (
        <div className="hidden items-center sm:flex">
          <span className="rounded-full border border-white/10 bg-surface-light px-3 py-1 text-xs font-medium text-white/30">
            vs
          </span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {displayedProducts[1] && (
          <ProductCard
            key={displayedProducts[1].id}
            product={displayedProducts[1]}
            side="right"
            highlighted={
              highlightedId ===
              displayedProducts[1].id
            }
            onSelect={() =>
              send(
                `I like the right one — ${displayedProducts[1].name}`
              )
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
