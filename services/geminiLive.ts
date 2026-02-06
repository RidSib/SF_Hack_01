/**
 * Gemini Live API client — native audio model.
 *
 * Model: gemini-2.5-flash-native-audio-preview-12-2025
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
import { products } from "@/lib/products";
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
  "gemini-2.5-flash-native-audio-preview-12-2025";

const SYSTEM_INSTRUCTION = `You are TalkShop, \
a friendly and concise voice shopping assistant.
You help users find products by showing them \
two options at a time.
Use the show_products tool to display products.
Use the highlight_product tool to highlight one.

Available products (use these exact IDs):
${JSON.stringify(
  products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    color: p.color,
    rating: p.rating,
    tags: p.tags,
  })),
  null,
  0
)}

Rules:
- Always show exactly 2 products via show_products
- "left"/"first" → keep that, replace other
- "right"/"second" → keep that, replace other
- Filter by color, price, category, tags
- Be conversational, brief, and helpful
- Start by greeting and asking what they want`;

// -- Tool declarations --

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

const highlightProductFn: FunctionDeclaration = {
  name: "highlight_product",
  description: "Highlight a specific product",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: {
        type: Type.STRING,
        description: "The product ID to highlight",
      },
    },
    required: ["productId"],
  },
};

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
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
    // Prevent duplicate connections (e.g. React
    // 18 Strict Mode fires effects twice while
    // the first async connect is still in-flight)
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
            responseModalities: [Modality.AUDIO],
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
          "Hello, I just opened the shop. "
          + "Please greet me briefly and ask "
          + "what I'm looking for.",
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

  /** Signal end of audio stream (flushes VAD) */
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
    return this.session !== null
      || this.connecting;
  }

  // -- Internal message handler --

  private handleMessage(
    msg: LiveServerMessage
  ) {
    const cb = this.cb;
    if (!cb) return;

    const sc = msg.serverContent;
    if (sc) {
      // Interrupted by user speech (barge-in)
      if (sc.interrupted) cb.onInterrupt();

      // Model turn parts: audio / text
      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data) {
            cb.onAudioChunk(
              base64ToArrayBuffer(
                part.inlineData.data
              )
            );
          }
          if (part.text) cb.onText(part.text);
        }
      }

      // Output transcription (agent speech→text)
      const ot = sc.outputTranscription as
        | { text?: string }
        | undefined;
      if (ot?.text) cb.onOutputTranscript(ot.text);

      // Input transcription (user speech→text)
      const it = sc.inputTranscription as
        | { text?: string }
        | undefined;
      if (it?.text) cb.onInputTranscript(it.text);

      // Turn complete
      if (sc.turnComplete) cb.onTurnComplete();
    }

    // Tool calls
    if (msg.toolCall?.functionCalls) {
      const calls: FunctionCall[] =
        msg.toolCall.functionCalls;

      cb.onToolCall(
        calls.map((fc) => ({
          name: fc.name ?? "",
          args: (fc.args ?? {}) as Record<
            string,
            unknown
          >,
        }))
      );

      // Respond so model can continue speaking
      this.sendToolResponse(
        calls.map((fc) => ({
          id: fc.id ?? "",
          name: fc.name ?? "",
          response: { result: "ok" },
        }))
      );
    }
  }
}
