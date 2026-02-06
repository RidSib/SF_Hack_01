"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  AgentState,
  Message,
  Product,
} from "@/lib/types";
import { products as catalog } from "@/lib/products";
import { useGeminiLive } from "@/hooks/useGeminiLive";

type ShopContextValue = {
  displayedProducts: Product[];
  highlightedId: string | null;
  messages: Message[];
  agentState: AgentState;
  send: (text: string) => void;
  sendAudio: (
    pcm: ArrayBuffer,
    rate?: number
  ) => void;
  sendAudioStreamEnd: () => void;
  connectAgent: () => Promise<void>;
  connected: boolean;
};

const ShopContext =
  createContext<ShopContextValue | null>(null);

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx)
    throw new Error(
      "useShop must be inside ShopProvider"
    );
  return ctx;
}

function makeMsg(
  role: Message["role"],
  text: string
): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    role,
    text,
    timestamp: Date.now(),
  };
}

function resolveProducts(
  ids: string[]
): Product[] {
  return ids
    .map((id) =>
      catalog.find((p) => p.id === id)
    )
    .filter(Boolean) as Product[];
}

export function ShopProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [displayedProducts, setDisplayed] =
    useState<Product[]>([]);
  const [highlightedId, setHighlighted] =
    useState<string | null>(null);
  const [messages, setMessages] = useState<
    Message[]
  >([]);
  const [agentState, setAgentState] =
    useState<AgentState>("idle");

  // Accumulate partial transcription fragments
  const agentTransBuf = useRef("");
  const userTransBuf = useRef("");

  // -- Tool calls --
  const processToolCalls = useCallback(
    (
      calls: {
        name: string;
        args: Record<string, unknown>;
      }[]
    ) => {
      for (const call of calls) {
        if (call.name === "show_products") {
          const ids =
            (call.args.productIds as
              | string[]
              | undefined) ?? [];
          setDisplayed(resolveProducts(ids));
          setHighlighted(null);
        }
        if (call.name === "highlight_product") {
          setHighlighted(
            (call.args.productId as string) ??
              null
          );
        }
      }
    },
    []
  );

  // -- Text fragments (fallback) --
  const handleText = useCallback(
    (_text: string) => {
      // With native audio the model mostly
      // sends audio; text parts are rare.
    },
    []
  );

  // -- Audio transcription callbacks --
  const handleOutputTranscript = useCallback(
    (text: string) => {
      agentTransBuf.current += text;
    },
    []
  );

  const handleInputTranscript = useCallback(
    (text: string) => {
      userTransBuf.current += text;
    },
    []
  );

  // -- Turn lifecycle --
  const handleTurnComplete = useCallback(() => {
    // Flush agent transcription buffer
    const agentTxt =
      agentTransBuf.current.trim();
    if (agentTxt) {
      setMessages((prev) => [
        ...prev,
        makeMsg("agent", agentTxt),
      ]);
    }
    agentTransBuf.current = "";

    // Flush user transcription buffer
    const userTxt =
      userTransBuf.current.trim();
    if (userTxt) {
      setMessages((prev) => [
        ...prev,
        makeMsg("user", userTxt),
      ]);
    }
    userTransBuf.current = "";

    setAgentState("idle");
  }, []);

  const handleInterrupt = useCallback(() => {
    setAgentState("listening");
  }, []);

  // -- Gemini Live hook --
  const {
    connected,
    speaking,
    connect,
    sendAudio: geminiSendAudio,
    sendAudioStreamEnd: geminiStreamEnd,
    sendText: geminiSendText,
  } = useGeminiLive({
    onToolCall: processToolCalls,
    onText: handleText,
    onOutputTranscript: handleOutputTranscript,
    onInputTranscript: handleInputTranscript,
    onTurnComplete: handleTurnComplete,
    onInterrupt: handleInterrupt,
  });

  const derivedState: AgentState = speaking
    ? "speaking"
    : agentState;

  const connectAgent = useCallback(async () => {
    setAgentState("processing");
    await connect();
    setAgentState("idle");
  }, [connect]);

  // Send typed text
  const send = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        makeMsg("user", text),
      ]);
      setAgentState("processing");
      agentTransBuf.current = "";
      geminiSendText(text);
    },
    [geminiSendText]
  );

  // Send raw mic PCM
  const sendAudio = useCallback(
    (pcm: ArrayBuffer, rate?: number) =>
      geminiSendAudio(pcm, rate),
    [geminiSendAudio]
  );

  const sendAudioStreamEnd = useCallback(
    () => geminiStreamEnd(),
    [geminiStreamEnd]
  );

  return (
    <ShopContext.Provider
      value={{
        displayedProducts,
        highlightedId,
        messages,
        agentState: derivedState,
        send,
        sendAudio,
        sendAudioStreamEnd,
        connectAgent,
        connected,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}
