/** A narration voice as the reader UI and /api/tts/voices exchange it. */
export interface NarrationVoice {
  id: string;
  name: string;
  gender: "male" | "female" | "other";
  locale: string;
  previewUrl: string | null;
  avatarUrl: string | null;
}
