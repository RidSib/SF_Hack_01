"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import { useShop } from "@/context/ShopContext";
import {
  useAudioRecorder,
} from "@/hooks/useAudioRecorder";
import MicButton from "./MicButton";
import ChatBubble from "./ChatBubble";

export default function AudioBar() {
  const {
    messages,
    agentState,
    send,
    sendAudio,
    sendAudioStreamEnd,
    connectAgent,
    connected,
  } = useShop();

  // Stream each PCM chunk to Gemini Live
  const onAudioChunk = useCallback(
    (pcm: ArrayBuffer, rate: number) =>
      sendAudio(pcm, rate),
    [sendAudio]
  );

  const {
    recorderState,
    start: startMic,
    mute: muteMic,
    unmute: unmuteMic,
  } = useAudioRecorder(onAudioChunk);

  const [text, setText] = useState("");
  const [chatOpen, setChatOpen] =
    useState(false);
  const scrollRef =
    useRef<HTMLDivElement>(null);

  // Connect to Gemini on mount
  useEffect(() => {
    if (!connected) connectAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start mic once connected
  useEffect(() => {
    if (connected && recorderState === "idle") {
      startMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight;
    }
  }, [messages]);


  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    send(trimmed);
  };

  const handleKey = (
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") handleSend();
  };

  // Toggle mute on mic button click
  const handleMicToggle = () => {
    if (!connected) return;
    if (recorderState === "muted") {
      unmuteMic();
    } else {
      muteMic();
      // Tell Gemini the audio stream paused
      sendAudioStreamEnd();
    }
  };

  // Derive visual mic state
  const micState =
    recorderState === "muted"
      ? ("idle" as const)
      : recorderState === "active"
        ? ("listening" as const)
        : agentState;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center">
      {/* Chat transcript */}
      <AnimatePresence>
        {chatOpen && messages.length > 0 && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full max-w-2xl overflow-hidden px-4"
          >
            <div
              ref={scrollRef}
              className="flex max-h-60 flex-col gap-2 overflow-y-auto rounded-t-2xl border border-b-0 border-white/10 bg-surface/95 p-4 backdrop-blur-xl"
            >
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="w-full border-t border-white/10 bg-surface/95 px-4 pb-6 pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {/* Toggle chat */}
          <button
            onClick={() =>
              setChatOpen(!chatOpen)
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            aria-label="Toggle chat"
          >
            <svg
              className={`h-5 w-5 transition-transform ${
                chatOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>

          {/* Text input */}
          <input
            type="text"
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            onKeyDown={handleKey}
            placeholder={
              connected
                ? "Type a message..."
                : "Connecting..."
            }
            disabled={!connected}
            className="flex-1 rounded-full border border-white/10 bg-surface-light px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-primary/50 disabled:opacity-50"
          />

          {/* Send text button */}
          <AnimatePresence>
            {text.trim() && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={handleSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12h14m-7-7l7 7-7 7"
                  />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Mic button (click to toggle) */}
          <MicButton
            state={micState}
            muted={recorderState === "muted"}
            onClick={handleMicToggle}
          />
        </div>

        {/* Hint */}
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-white/20">
          {!connected
            ? "Connecting to AI assistant..."
            : recorderState === "muted"
              ? "Mic muted · Click mic to unmute"
              : "Listening · Click mic to mute"}
        </p>
      </div>
    </div>
  );
}
