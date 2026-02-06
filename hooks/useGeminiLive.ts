"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  GeminiLiveClient,
  type GeminiCallbacks,
} from "@/services/geminiLive";
import { AudioPlayer } from "@/lib/audioUtils";

type UseGeminiLiveOpts = {
  onToolCall: GeminiCallbacks["onToolCall"];
  onText: GeminiCallbacks["onText"];
  onOutputTranscript: GeminiCallbacks[
    "onOutputTranscript"
  ];
  onInputTranscript: GeminiCallbacks[
    "onInputTranscript"
  ];
  onTurnComplete?: () => void;
  onInterrupt?: () => void;
};

export function useGeminiLive(
  opts: UseGeminiLiveOpts
) {
  const [connected, setConnected] =
    useState(false);
  const [speaking, setSpeaking] =
    useState(false);

  const clientRef =
    useRef<GeminiLiveClient | null>(null);
  const playerRef =
    useRef<AudioPlayer | null>(null);
  const mountedRef = useRef(true);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current =
        new GeminiLiveClient();
    }
    return clientRef.current;
  }, []);

  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new AudioPlayer();
    }
    return playerRef.current;
  }, []);

  const connect = useCallback(async () => {
    const apiKey =
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      console.error(
        "Set NEXT_PUBLIC_GEMINI_API_KEY"
      );
      return;
    }

    const client = getClient();
    const player = getPlayer();

    if (client.connected) {
      setConnected(true);
      return;
    }

    const callbacks: GeminiCallbacks = {
      onAudioChunk: (pcm) => {
        if (!mountedRef.current) return;
        setSpeaking(true);
        player.enqueue(pcm);
      },
      onToolCall: (calls) => {
        if (!mountedRef.current) return;
        optsRef.current.onToolCall(calls);
      },
      onText: (text) => {
        if (!mountedRef.current) return;
        optsRef.current.onText(text);
      },
      onOutputTranscript: (text) => {
        if (!mountedRef.current) return;
        optsRef.current
          .onOutputTranscript(text);
      },
      onInputTranscript: (text) => {
        if (!mountedRef.current) return;
        optsRef.current
          .onInputTranscript(text);
      },
      onInterrupt: () => {
        if (!mountedRef.current) return;
        player.clear();
        setSpeaking(false);
        optsRef.current.onInterrupt?.();
      },
      onTurnComplete: () => {
        if (!mountedRef.current) return;
        setSpeaking(false);
        optsRef.current.onTurnComplete?.();
      },
    };

    try {
      await client.connect(apiKey, callbacks);
      if (mountedRef.current) {
        setConnected(true);
      }
    } catch (err) {
      console.error(
        "[GeminiLive] connect failed:",
        err
      );
    }
  }, [getClient, getPlayer]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
    setConnected(false);
    setSpeaking(false);
  }, []);

  const sendAudio = useCallback(
    (pcm: ArrayBuffer, rate?: number) => {
      clientRef.current?.sendAudio(pcm, rate);
    },
    []
  );

  const sendAudioStreamEnd = useCallback(() => {
    clientRef.current?.sendAudioStreamEnd();
  }, []);

  const sendText = useCallback(
    (text: string) => {
      clientRef.current?.sendText(text);
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    connected,
    speaking,
    connect,
    disconnect,
    sendAudio,
    sendAudioStreamEnd,
    sendText,
  };
}
