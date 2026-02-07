/**
 * Gemini Live API client — native audio model.
 *
 * Model: gemini-2.5-flash-native-audio-preview
 * Features: affective dialog, audio transcription,
 *           function calling, VAD, thinking.
 */
import {
  GoogleGenAI,
  Modality,
  Type,
  type Session,
  type LiveServerMessage,
  type FunctionCall,
  type FunctionDeclaration,
  type Tool,
} from "@google/genai";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "@/lib/audioUtils";

// -- Callback types --

export type OnAudioChunkCb = (
  pcm: ArrayBuffer
) => void;
export type OnToolCallCb = (
  calls: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  }[]
) => void;
export type OnTextCb = (text: string) => void;
export type OnTranscriptCb = (
  text: string
) => void;
export type OnInterruptCb = () => void;
export type OnTurnCompleteCb = () => void;

export type GeminiCallbacks = {
  onAudioChunk: OnAudioChunkCb;
  onToolCall: OnToolCallCb;
  onText: OnTextCb;
  /** Transcription of the model's audio */
  onOutputTranscript: OnTranscriptCb;
  /** Transcription of the user's audio */
  onInputTranscript: OnTranscriptCb;
  onInterrupt: OnInterruptCb;
  onTurnComplete: OnTurnCompleteCb;
};

// -- Config --

const MODEL =
  "gemini-2.5-flash-native-audio-preview" +
  "-12-2025";

const SYSTEM_INSTRUCTION = `You are TalkShop, \
a friendly and concise voice shopping assistant.
You help users find products from a real catalog.

Catalog info:
- Categories use singular form: "shoe" (not \
"shoes"). The catalog currently focuses on \
shoes/sneakers.
- Brands include Nike.
- Use the "text" parameter for broad searches.

Tools:
- search_products: Search the product catalog. \
Call this first. Prefer the "text" param for \
broad queries; use specific filters only when \
the user mentions them explicitly.
- show_products: Display exactly 2 products \
side by side for the user to compare.
- highlight_product: Highlight one product.

Flow:
1. When the user asks for products, call \
search_products with relevant filters.
2. Pick exactly 2 from the results and call \
show_products with their product IDs.
3. When user says "left"/"first", keep that \
product and search or pick a replacement for \
the other.
4. When user says "right"/"second", same but \
keep the right one.

Rules:
- Always show exactly 2 products via \
show_products
- You can filter by category, brand, colors, \
materials, style_tags, use_cases, price range, \
or free-text search
- Be conversational, brief, and helpful
- Start by greeting and asking what they want`;

// -- Tool declarations --

const searchProductsFn: FunctionDeclaration = {
  name: "search_products",
  description:
    "Search the product catalog with filters",
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "Product category",
      },
      brand: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Brand names to filter",
      },
      colors: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Color filters",
      },
      materials: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Material filters",
      },
      style_tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Style tag filters",
      },
      use_cases: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Use case filters",
      },
      price_min: {
        type: Type.NUMBER,
        description: "Minimum price (USD)",
      },
      price_max: {
        type: Type.NUMBER,
        description: "Maximum price (USD)",
      },
      text: {
        type: Type.STRING,
        description: "Free-text search query",
      },
      limit: {
        type: Type.NUMBER,
        description:
          "Max results (default 10)",
      },
    },
  },
};

const showProductsFn: FunctionDeclaration = {
  name: "show_products",
  description:
    "Display two products side by side",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "Array of exactly 2 product IDs",
      },
    },
    required: ["productIds"],
  },
};

const highlightProductFn: FunctionDeclaration =
  {
    name: "highlight_product",
    description:
      "Highlight a specific product",
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: {
          type: Type.STRING,
          description:
            "The product ID to highlight",
        },
      },
      required: ["productId"],
    },
  };

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      searchProductsFn,
      showProductsFn,
      highlightProductFn,
    ],
  },
];

// -- Gemini Live Client --

export class GeminiLiveClient {
  private session: Session | null = null;
  private cb: GeminiCallbacks | null = null;
  private ai: GoogleGenAI | null = null;
  private connecting = false;

  async connect(
    apiKey: string,
    callbacks: GeminiCallbacks
  ) {
    if (this.connecting || this.session) return;
    this.connecting = true;
    this.cb = callbacks;

    try {
      // v1alpha enables affective dialog
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          apiVersion: "v1alpha",
        },
      });

      this.session =
        await this.ai.live.connect({
          model: MODEL,
          config: {
            responseModalities: [
              Modality.AUDIO,
            ],
            systemInstruction:
              SYSTEM_INSTRUCTION,
            tools: TOOLS,
            enableAffectiveDialog: true,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
            onopen: () =>
              console.log(
                "[GeminiLive] connected"
              ),
            onmessage: (
              msg: LiveServerMessage
            ) => this.handleMessage(msg),
            onerror: (e: ErrorEvent) =>
              console.error(
                "[GeminiLive] error:",
                e
              ),
            onclose: () =>
              console.log(
                "[GeminiLive] disconnected"
              ),
          },
        });

      // Trigger the greeting
      this.session.sendClientContent({
        turns:
          "Hello, I just opened the shop. " +
          "Please greet me briefly and ask " +
          "what I'm looking for.",
        turnComplete: true,
      });
    } finally {
      this.connecting = false;
    }
  }

  /** Send PCM audio chunk (Int16) */
  sendAudio(pcm: ArrayBuffer, rate = 16000) {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      audio: {
        data: arrayBufferToBase64(pcm),
        mimeType: `audio/pcm;rate=${rate}`,
      },
    });
  }

  /** Signal end of audio stream */
  sendAudioStreamEnd() {
    if (!this.session) return;
    this.session.sendRealtimeInput({
      audioStreamEnd: true,
    });
  }

  /** Send a text message */
  sendText(text: string) {
    if (!this.session) return;
    this.session.sendClientContent({
      turns: text,
      turnComplete: true,
    });
  }

  /** Send tool responses back */
  sendToolResponse(
    responses: {
      id: string;
      name: string;
      response: Record<string, unknown>;
    }[]
  ) {
    if (!this.session) return;
    this.session.sendToolResponse({
      functionResponses: responses,
    });
  }

  disconnect() {
    this.connecting = false;
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.cb = null;
    this.ai = null;
  }

  get connected() {
    return (
      this.session !== null || this.connecting
    );
  }

  // -- Internal message handler --

  private handleMessage(
    msg: LiveServerMessage
  ) {
    const cb = this.cb;
    if (!cb) return;

    const sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) cb.onInterrupt();

      if (sc.modelTurn?.parts) {
        for (const p of sc.modelTurn.parts) {
          if (p.inlineData?.data) {
            cb.onAudioChunk(
              base64ToArrayBuffer(
                p.inlineData.data
              )
            );
          }
          if (p.text) cb.onText(p.text);
        }
      }

      const ot = sc.outputTranscription as
        | { text?: string }
        | undefined;
      if (ot?.text)
        cb.onOutputTranscript(ot.text);

      const it = sc.inputTranscription as
        | { text?: string }
        | undefined;
      if (it?.text)
        cb.onInputTranscript(it.text);

      if (sc.turnComplete) cb.onTurnComplete();
    }

    // Tool calls — delegate to caller
    // (caller must send tool response)
    if (msg.toolCall?.functionCalls) {
      const calls: FunctionCall[] =
        msg.toolCall.functionCalls;

      cb.onToolCall(
        calls.map((fc) => ({
          id: fc.id ?? "",
          name: fc.name ?? "",
          args: (fc.args ?? {}) as Record<
            string,
            unknown
          >,
        }))
      );
    }
  }
}
