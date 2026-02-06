/**
 * Mock speech services.
 * transcribeAudio: ignores blob, returns canned text
 * speakText: uses browser speechSynthesis
 */

const CANNED_TRANSCRIPTS = [
  "I'm looking for some good headphones",
  "Show me something for the kitchen",
  "I like the one on the right",
  "Something cheaper please",
  "No red items",
  "Show me more options",
];

let transcriptIdx = 0;

export async function transcribeAudio(
  _blob: Blob
): Promise<string> {
  await new Promise((r) => setTimeout(r, 500));
  const text = CANNED_TRANSCRIPTS[transcriptIdx];
  transcriptIdx =
    (transcriptIdx + 1) % CANNED_TRANSCRIPTS.length;
  return text;
}

export async function speakText(
  text: string
): Promise<void> {
  return new Promise((resolve) => {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      resolve();
      return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text
    );
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (
    typeof window !== "undefined" &&
    window.speechSynthesis
  ) {
    window.speechSynthesis.cancel();
  }
}
