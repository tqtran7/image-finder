/**
 * Default tagging prompt — used when a collection has no custom prompt set.
 * Kept in its own file so client components can import just this constant
 * without pulling in server-only dependencies (Anthropic SDK, resvg, etc.).
 */
export const DEFAULT_TAG_PROMPT =
  'This is an icon or image file. List 3–8 short, descriptive tags that describe what this icon depicts or what it is used for. Return ONLY a JSON array of lowercase strings, nothing else. Example: ["arrow","navigation","direction","ui"]';

/**
 * Default prompt for 3D meshes. The model sees a rendered 3/4-view snapshot of the
 * mesh (not the raw file), so the wording asks about the depicted object rather than
 * an icon. Used when a mesh collection has no custom prompt set.
 */
export const DEFAULT_MESH_TAG_PROMPT =
  'This is a rendered preview of a 3D model. List 3–8 short, descriptive tags for what the object is, its category, and notable visual features. Return ONLY a JSON array of lowercase strings, nothing else. Example: ["chair","furniture","wooden","seat"]';

/**
 * Sentence appended to a mesh prompt when more than one angle is sent, so the model
 * understands the images show one object from several viewpoints rather than several objects.
 */
export function multiAngleNote(count: number): string {
  return ` You are shown ${count} rendered views of the SAME 3D model from different angles. Describe the single object, not each view separately.`;
}

/**
 * Extracts a tag list from a model's text response. Finds the first JSON array,
 * parses it, and returns lowercased, trimmed, de-duplicated strings. Returns an
 * empty array if nothing parseable is found. Shared by every tagger backend.
 */
export function parseTags(text: string): string[] {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.toLowerCase().trim())
          .filter(Boolean),
      ),
    ];
  } catch {
    return [];
  }
}
