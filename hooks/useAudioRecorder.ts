"use client";

import {
  useRef,
  useState,
  useCallback,
} from "react";
import {
  MicCapture,
  type OnAudioChunk,
} from "@/lib/audioUtils";

export type RecorderState =
  | "idle"
  | "active"
  | "muted";

/**
 * Always-on mic that streams PCM chunks.
 * Use start() once, then mute()/unmute()
 * to control whether audio is sent.
 */
export function useAudioRecorder(
  onChunk: OnAudioChunk
) {
  const [state, setState] =
    useState<RecorderState>("idle");
  const mic = useRef<MicCapture | null>(null);

  const start = useCallback(async () => {
    if (mic.current) return; // already running
    try {
      const m = new MicCapture();
      await m.start(onChunk);
      mic.current = m;
      setState("active");
    } catch {
      console.warn("Mic access denied");
    }
  }, [onChunk]);

  const mute = useCallback(() => {
    mic.current?.mute();
    setState("muted");
  }, []);

  const unmute = useCallback(async () => {
    await mic.current?.unmute();
    setState("active");
  }, []);

  const stop = useCallback(() => {
    mic.current?.stop();
    mic.current = null;
    setState("idle");
  }, []);

  return {
    recorderState: state,
    start,
    stop,
    mute,
    unmute,
  };
}
