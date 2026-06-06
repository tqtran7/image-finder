export interface Tagger {
  tag(absPath: string, ext: string): Promise<string[]>;
}

export function getTagger(): Tagger {
  // Dynamic require so Next doesn't try to bundle @anthropic-ai/sdk at build time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ClaudeTagger } = require("./claude") as typeof import("./claude");
  return new ClaudeTagger();
}
