export { DEFAULT_TAG_PROMPT, DEFAULT_MESH_TAG_PROMPT } from "@/lib/taggers/prompts";

export interface TagImage {
  bytes: Buffer;
  /** MIME type of `bytes`, e.g. "image/png". */
  mediaType: string;
}

export interface Tagger {
  tag(absPath: string, ext: string, prompt?: string, invert?: boolean, addBlackBackground?: boolean): Promise<string[]>;
  /**
   * Tags one or more already-decoded images in a single request (e.g. client-rendered
   * mesh snapshots from several angles), skipping the disk read that {@link tag} performs.
   */
  tagImageBytes(images: TagImage[], prompt?: string): Promise<string[]>;
}

/** The model name recorded alongside auto-generated tags/suggestions. */
export function getTaggerModel(): string {
  return process.env.TAGGER_MODEL ?? "claude-haiku-4-5";
}

export function getTagger(): Tagger {
  const provider = (process.env.TAGGER_PROVIDER ?? "claude").toLowerCase().trim();

  if (provider === "ollama") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OllamaTagger } = require("./ollama") as typeof import("./ollama");
    return new OllamaTagger();
  }

  if (provider === "lmstudio") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LMStudioTagger } = require("./lmstudio") as typeof import("./lmstudio");
    return new LMStudioTagger();
  }

  // Default: Anthropic Claude
  // Dynamic require so Next doesn't try to bundle @anthropic-ai/sdk at build time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ClaudeTagger } = require("./claude") as typeof import("./claude");
  return new ClaudeTagger();
}
