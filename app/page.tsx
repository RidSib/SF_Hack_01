"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Animated gradient bg */}
      <div
        className="animate-gradient absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #1e1b2e 0%, #2d1b4e 25%, #1e1b2e 50%, #1b2e3e 75%, #1e1b2e 100%)",
          backgroundSize: "400% 400%",
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center text-center"
      >
        {/* Badge */}
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 backdrop-blur-sm"
        >
          AI-Powered Shopping
        </motion.span>

        {/* Title */}
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
          Find your perfect
          <br />
          <span className="gradient-text">
            product, by voice
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-lg text-lg text-white/60">
          Just tell our AI assistant what you
          need. It listens, understands, and shows
          you the best matches — no scrolling, no
          filters, just a conversation.
        </p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10"
        >
          <Link
            href="/shop"
            className="group relative inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25"
          >
            Start Shopping
            <svg
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </motion.div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-sm text-white/30"
        >
          Works best with a microphone enabled
        </motion.p>
      </motion.div>
    </main>
  );
}
