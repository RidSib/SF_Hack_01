/**
 * Audio utilities for Gemini Live API.
 *
 * Input:  16-bit PCM, mono (any sample rate)
 * Output: 16-bit PCM, 24 kHz, mono
 */

// -- PCM conversion helpers --

/** Float32 [-1,1] -> Int16 PCM bytes */
export function float32ToInt16(
  float32: Float32Array
): ArrayBuffer {
  const buf = new ArrayBuffer(
    float32.length * 2
  );
  const view = new DataView(buf);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(
      -1,
      Math.min(1, float32[i])
    );
    view.setInt16(
      i * 2,
      s < 0 ? s * 0x8000 : s * 0x7fff,
      true
    );
  }
  return buf;
}

/** ArrayBuffer of Int16 PCM -> Float32Array */
export function int16ToFloat32(
  pcmBuf: ArrayBuffer
): Float32Array {
  const view = new DataView(pcmBuf);
  const len = pcmBuf.byteLength / 2;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const s = view.getInt16(i * 2, true);
    out[i] = s / (s < 0 ? 0x8000 : 0x7fff);
  }
  return out;
}

// -- Base64 helpers --

export function arrayBufferToBase64(
  buf: ArrayBuffer
): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(
  b64: string
): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// -- Audio playback queue (24 kHz output) --

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private nextTime = 0;
  private sources: AudioBufferSourceNode[] = [];

  private init() {
    if (!this.ctx) {
      this.ctx = new AudioContext({
        sampleRate: 24000,
      });
    }
    return this.ctx;
  }

  /** Schedule a chunk for gapless playback
   *  immediately — no waiting for previous
   *  chunks to finish. */
  enqueue(pcmData: ArrayBuffer) {
    const ctx = this.init();
    const float32 = int16ToFloat32(pcmData);
    const buf = ctx.createBuffer(
      1, float32.length, 24000
    );
    buf.getChannelData(0).set(float32);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(
      now, this.nextTime
    );
    src.start(startAt);
    this.nextTime = startAt + buf.duration;

    this.sources.push(src);
    src.onended = () => {
      const i = this.sources.indexOf(src);
      if (i !== -1) this.sources.splice(i, 1);
    };
  }

  stop() {
    for (const s of this.sources) {
      try { s.stop(); } catch { /* noop */ }
    }
    this.sources = [];
    this.nextTime = 0;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  clear() {
    for (const s of this.sources) {
      try { s.stop(); } catch { /* noop */ }
    }
    this.sources = [];
    this.nextTime = 0;
  }
}

// -- Always-on mic capture --

export type OnAudioChunk = (
  pcm: ArrayBuffer,
  sampleRate: number
) => void;

/**
 * Captures mic audio continuously.
 * Uses native AudioContext sample rate for
 * maximum browser compatibility.
 * Call mute()/unmute() to pause/resume sending
 * without tearing down the audio pipeline.
 */
export class MicCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor:
    | ScriptProcessorNode
    | null = null;
  private source:
    | MediaStreamAudioSourceNode
    | null = null;
  private onChunk: OnAudioChunk | null = null;
  private _muted = false;
  private _rate = 16000;

  get sampleRate() {
    return this._rate;
  }
  get muted() {
    return this._muted;
  }

  async start(onChunk: OnAudioChunk) {
    if (this.ctx) return; // already running
    this.onChunk = onChunk;
    this._muted = false;

    this.stream =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

    // Use 16kHz context — Chrome supports this
    // natively and resamples from the hardware.
    // If browser ignores it, we report the
    // actual rate so Gemini can resample.
    this.ctx = new AudioContext({
      sampleRate: 16000,
    });
    this._rate = this.ctx.sampleRate;

    this.source =
      this.ctx.createMediaStreamSource(
        this.stream
      );

    // 4096 frames ≈ 256ms at 16kHz
    this.processor =
      this.ctx.createScriptProcessor(
        4096, 1, 1
      );

    this.processor.onaudioprocess = (e) => {
      if (this._muted || !this.onChunk) return;
      const data =
        e.inputBuffer.getChannelData(0);
      const pcm = float32ToInt16(data);
      this.onChunk(pcm, this._rate);
    };

    this.source.connect(this.processor);
    this.processor.connect(
      this.ctx.destination
    );

    console.log(
      `[MicCapture] started at ${this._rate}Hz`
    );
  }

  /** Release mic hardware so OS indicator
   *  turns off. Keeps onChunk so unmute()
   *  can restart the pipeline. */
  mute() {
    this._muted = true;
    this.teardown(false);
  }

  /** Re-acquire mic and resume streaming. */
  async unmute() {
    if (!this._muted) return;
    this._muted = false;
    if (this.onChunk) await this.start(
      this.onChunk
    );
  }

  stop() {
    this.teardown(true);
  }

  private teardown(full: boolean) {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream
      ?.getTracks()
      .forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.stream = null;
    this.processor = null;
    this.source = null;
    if (full) {
      this.onChunk = null;
      this._muted = false;
    }
  }
}
