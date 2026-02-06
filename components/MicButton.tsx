"use client";

import { AgentState } from "@/lib/types";

type Props = {
  state: AgentState;
  muted: boolean;
  onClick: () => void;
};

export default function MicButton({
  state,
  muted,
  onClick,
}: Props) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";

  return (
    <button
      onClick={onClick}
      className="relative flex h-16 w-16 items-center justify-center rounded-full outline-none transition-all focus:outline-none"
      aria-label={
        muted ? "Unmute microphone" : "Mute"
      }
    >
      {/* Pulse ring when actively listening */}
      {isListening && !muted && (
        <span className="animate-pulse-ring absolute inset-0 rounded-full bg-red-500/40" />
      )}

      {/* Base circle */}
      <span
        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
          muted
            ? "bg-white/10 hover:bg-white/20"
            : isListening
              ? "bg-red-500 shadow-lg shadow-red-500/30"
              : isSpeaking
                ? "bg-primary-light"
                : "bg-primary hover:bg-primary-dark"
        }`}
      >
        {isSpeaking && !muted ? (
          /* Waveform bars */
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="w-1 animate-pulse rounded-full bg-white"
                style={{
                  height: `${
                    12 + Math.random() * 12
                  }px`,
                  animationDelay: `${
                    i * 0.1
                  }s`,
                }}
              />
            ))}
          </div>
        ) : muted ? (
          /* Muted mic icon (slash) */
          <svg
            className="h-6 w-6 text-white/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0v4m0-4a7 7 0 01-7-7m7-6a3 3 0 00-3 3v4m0 0l10 10M5 5l14 14"
            />
          </svg>
        ) : (
          /* Active mic icon */
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-4-18a3 3 0 00-3 3v4a3 3 0 006 0V7a3 3 0 00-3-3z"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
