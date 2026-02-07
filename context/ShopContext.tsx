"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  AgentState,
  Message,
  Product,
} from "@/lib/types";
import {
  cacheProducts,
  resolveProducts,
} from "@/lib/products";
import {
  searchProducts,
  recordInteraction,
  getOrCreateUser,
  type SearchParams,
  type BackendProduct,
} from "@/lib/api";
import { useGeminiLive } from "@/hooks/useGeminiLive";

// -- Context type --

type ShopContextValue = {
  displayedProducts: Product[];
  highlightedId: string | null;
  messages: Message[];
  agentState: AgentState;
  send: (text: string) => void;
  selectProduct: (
    productId: string,
    side: "left" | "right"
  ) => void;
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

// -- Helpers --

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

function toProduct(bp: BackendProduct): Product {
  return {
    product_id: bp.product_id,
    name: bp.name,
    brand: bp.brand,
    category: bp.category,
    sub_category: bp.sub_category,
    price: bp.price,
    currency: bp.currency,
    color: bp.color,
    material: bp.material,
    attributes: bp.attributes,
    image_path: bp.image_path,
    product_url: bp.product_url,
    product_summary: bp.product_summary,
  };
}

function getUserId(): string {
  const key = "talkshop_user_id";
  if (typeof window === "undefined") {
    return "anonymous";
  }
  let id = localStorage.getItem(key);
  if (!id) {
    id =
      `usr_${Date.now()}_` +
      Math.random().toString(36).slice(2, 8);
    localStorage.setItem(key, id);
  }
  return id;
}

type ToolResponse = {
  id: string;
  name: string;
  response: Record<string, unknown>;
};

// -- Provider --

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

  const liveAgentId = useRef<string | null>(
    null
  );
  const userTransBuf = useRef("");
  const userIdRef = useRef("");

  // Ref for sendToolResponse (resolved after
  // useGeminiLive hook, avoids circular dep)
  const toolResRef = useRef<
    (r: ToolResponse[]) => void
  >(() => {});

  // Init user on mount
  useEffect(() => {
    const uid = getUserId();
    userIdRef.current = uid;
    getOrCreateUser(uid).catch((e) =>
      console.warn("[ShopProvider] user:", e)
    );
  }, []);

  // -- Tool call processing (async) --
  const processToolCalls = useCallback(
    async (
      calls: {
        id: string;
        name: string;
        args: Record<string, unknown>;
      }[]
    ) => {
      console.log(
        "[ToolCalls] received:",
        calls.map((c) => c.name)
      );
      const responses: ToolResponse[] = [];

      for (const call of calls) {
        if (call.name === "search_products") {
          try {
            const a = call.args;
            const params: SearchParams = {
              limit:
                (a.limit as number) ?? 10,
            };
            if (a.category)
              params.category =
                a.category as string;
            if (a.brand)
              params.brand =
                a.brand as string[];
            if (a.colors)
              params.colors =
                a.colors as string[];
            if (a.materials)
              params.materials =
                a.materials as string[];
            if (a.style_tags)
              params.style_tags =
                a.style_tags as string[];
            if (a.use_cases)
              params.use_cases =
                a.use_cases as string[];
            if (a.price_min != null)
              params.price_min =
                a.price_min as number;
            if (a.price_max != null)
              params.price_max =
                a.price_max as number;
            if (a.text)
              params.text = a.text as string;

            console.log(
              "[search_products] params:",
              JSON.stringify(params)
            );
            let raw =
              await searchProducts(params);
            console.log(
              "[search_products] got",
              raw.length,
              "results"
            );
            // Fallback: if filters returned
            // nothing, retry with text-only
            // then with no filters at all
            if (raw.length === 0) {
              const hint = [
                params.category,
                params.text,
                ...(params.brand ?? []),
                ...(params.colors ?? []),
              ]
                .filter(Boolean)
                .join(" ");
              if (hint) {
                raw = await searchProducts({
                  text: hint,
                  limit: params.limit,
                });
                console.log(
                  "[search_products]",
                  "text fallback got",
                  raw.length
                );
              }
            }
            if (raw.length === 0) {
              raw = await searchProducts({
                limit: params.limit ?? 10,
              });
              console.log(
                "[search_products]",
                "unfiltered fallback got",
                raw.length
              );
            }
            const products =
              raw.map(toProduct);
            cacheProducts(products);

            responses.push({
              id: call.id,
              name: call.name,
              response: {
                products: products.map(
                  (p) => ({
                    product_id: p.product_id,
                    name: p.name,
                    brand: p.brand,
                    category: p.category,
                    price: p.price,
                    color: p.color,
                    material: p.material,
                  })
                ),
              },
            });
          } catch (err) {
            console.error(
              "[search_products]",
              err
            );
            responses.push({
              id: call.id,
              name: call.name,
              response: {
                error: String(err),
              },
            });
          }
        } else if (
          call.name === "show_products"
        ) {
          const ids =
            (call.args.productIds as
              | string[]
              | undefined) ?? [];
          console.log(
            "[show_products] ids:", ids,
            "resolved:",
            resolveProducts(ids).length
          );
          setDisplayed(resolveProducts(ids));
          setHighlighted(null);
          responses.push({
            id: call.id,
            name: call.name,
            response: { result: "ok" },
          });
        } else if (
          call.name === "highlight_product"
        ) {
          setHighlighted(
            (call.args.productId as string) ??
              null
          );
          responses.push({
            id: call.id,
            name: call.name,
            response: { result: "ok" },
          });
        }
      }

      console.log(
        "[ToolCalls] sending",
        responses.length,
        "responses"
      );
      toolResRef.current(responses);
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
      setMessages((prev) => {
        const id = liveAgentId.current;
        if (id) {
          return prev.map((m) =>
            m.id === id
              ? { ...m, text: m.text + text }
              : m
          );
        }
        const msg = makeMsg("agent", text);
        liveAgentId.current = msg.id;
        return [...prev, msg];
      });
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
  const handleTurnComplete =
    useCallback(() => {
      liveAgentId.current = null;
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
    liveAgentId.current = null;
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
    sendToolResponse,
  } = useGeminiLive({
    onToolCall: processToolCalls,
    onText: handleText,
    onOutputTranscript:
      handleOutputTranscript,
    onInputTranscript: handleInputTranscript,
    onTurnComplete: handleTurnComplete,
    onInterrupt: handleInterrupt,
  });

  // Wire the ref so processToolCalls can
  // call sendToolResponse without a dep cycle
  toolResRef.current = sendToolResponse;

  const derivedState: AgentState = speaking
    ? "speaking"
    : agentState;

  const connectAgent =
    useCallback(async () => {
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
      liveAgentId.current = null;
      geminiSendText(text);
    },
    [geminiSendText]
  );

  // Select a product (click)
  const selectProduct = useCallback(
    (
      productId: string,
      side: "left" | "right"
    ) => {
      const product = displayedProducts.find(
        (p) => p.product_id === productId
      );
      const name =
        product?.name ?? "this one";
      const text =
        `I like the ${side} one — ${name}`;

      setMessages((prev) => [
        ...prev,
        makeMsg("user", text),
      ]);
      setAgentState("processing");
      liveAgentId.current = null;
      geminiSendText(text);

      // Record interaction with backend
      const uid = userIdRef.current;
      if (uid) {
        recordInteraction(
          uid,
          productId,
          "good"
        ).catch((e) =>
          console.warn("[interaction]", e)
        );
      }
    },
    [displayedProducts, geminiSendText]
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
        selectProduct,
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
