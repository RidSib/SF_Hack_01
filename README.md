# TalkShop

**Voice-first shopping assistant** — find products by having a conversation, not by scrolling through filters.

Built for the SF Hackathon by the Central Business Unit.

## What It Does

TalkShop lets users browse a product catalog using natural voice conversation. The AI assistant listens, understands what you're looking for, and shows two matching products side by side. You can refine by saying things like "something cheaper", "show me a blue one", or "I like the one on the left".

**Live demo:** [talkshopai.lovable.app](https://talkshopai.lovable.app/)

## How It Works

- **Real-time voice** via [Gemini Live API](https://ai.google.dev/) (native audio model with bidirectional streaming)
- **Voice Activity Detection** — no push-to-talk needed; just speak naturally
- **Barge-in** — interrupt the assistant mid-sentence
- **Live transcription** — agent speech streams to text in real time
- **Tool calling** — the model invokes `show_products` and `highlight_product` to control the UI

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Voice AI | Google Gemini 2.5 Flash (native audio) |
| Audio I/O | Web Audio API (16kHz capture, 24kHz playback) |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Deployment | Vercel |

## Architecture

```
Browser (client-side)
├── MicCapture → 16kHz PCM → Gemini Live WebSocket
├── Gemini Live → 24kHz PCM → AudioPlayer (gapless)
├── Gemini Live → output transcription → streaming chat
├── Gemini Live → tool calls → product display
└── Gemini Live → VAD + barge-in → interrupt handling
```

All voice processing happens client-side. The Gemini Live API handles speech-to-text, reasoning, tool use, and text-to-speech in a single bidirectional WebSocket connection.

## Getting Started

```bash
# Install dependencies
npm install

# Add your Gemini API key
echo "NEXT_PUBLIC_GEMINI_API_KEY=your_key_here" > .env.local

# Run locally
npm run dev
```

Open [http://localhost:3000/shop](http://localhost:3000/shop) and allow microphone access.

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add `NEXT_PUBLIC_GEMINI_API_KEY` in Settings → Environment Variables
4. Deploy

## Project Structure

```
app/            Next.js pages (landing + shop)
components/     AudioBar, MicButton, ChatBubble, ProductCard, ProductPair
context/        ShopContext (global state, message streaming, tool handling)
hooks/          useGeminiLive, useAudioRecorder
services/       GeminiLiveClient (WebSocket + message parsing)
lib/            Audio utilities, product catalog, types
```

## License

MIT
