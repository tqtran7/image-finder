/**
 * Default tagging prompt — used when a collection has no custom prompt set.
 * Kept in its own file so client components can import just this constant
 * without pulling in server-only dependencies (Anthropic SDK, resvg, etc.).
 */
export const DEFAULT_TAG_PROMPT =
  'This is an icon or image file. List 3–8 short, descriptive tags that describe what this icon depicts or what it is used for. Return ONLY a JSON array of lowercase strings, nothing else. Example: ["arrow","navigation","direction","ui"]';
