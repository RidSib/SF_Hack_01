"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useShop } from "@/context/ShopContext";
import ProductPair from "@/components/ProductPair";
import AudioBar from "@/components/AudioBar";

export default function ShopPage() {
  const { agentState, connected } = useShop();

  return (
    <main className="relative flex min-h-screen flex-col bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-surface/80 px-6 py-3 backdrop-blur-xl">
        <Link
          href="/"
          className="flex items-center gap-2 text-white/60 transition-colors hover:text-white"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm">Back</span>
        </Link>

        <h1 className="text-lg font-semibold gradient-text">
          TalkShop
        </h1>

        {/* Status pill */}
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              !connected
                ? "animate-pulse bg-yellow-400"
                : agentState === "idle"
                  ? "bg-green-400"
                  : agentState === "listening"
                    ? "animate-pulse bg-red-400"
                    : agentState === "processing"
                      ? "animate-pulse bg-yellow-400"
                      : "animate-pulse bg-primary-light"
            }`}
          />
          <span className="text-xs capitalize text-white/40">
            {!connected
              ? "connecting"
              : agentState}
          </span>
        </div>
      </header>

      {/* Product area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-1 items-center justify-center pb-32 pt-8"
      >
        <ProductPair />
      </motion.div>

      {/* Audio bar */}
      <AudioBar />
    </main>
  );
}
