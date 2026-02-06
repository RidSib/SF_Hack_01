"use client";

import { motion } from "framer-motion";
import { Message } from "@/lib/types";

export default function ChatBubble({
  message,
}: {
  message: Message;
}) {
  const isAgent = message.role === "agent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${
        isAgent ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isAgent
            ? "rounded-bl-sm bg-surface-lighter text-white/90"
            : "rounded-br-sm bg-primary/80 text-white"
        }`}
      >
        {message.text}
      </div>
    </motion.div>
  );
}
