import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const MODEL = process.env.TAGGER_MODEL ?? "claude-haiku-4-5";

const RASTER_MIME: Record<string, "image/png" | "image/jpeg" | "image/gif" | "image/webp"> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

const PROMPT =
  "This is an icon or image file. List 3–8 short, descriptive tags that describe what this icon depicts or what it is used for. Return ONLY a JSON array of lowercase strings, nothing else. Example: [\"arrow\",\"navigation\",\"direction\",\"ui\"]";

export class ClaudeTagger {
  private client = new Anthropic();

  async tag(absPath: string, ext: string): Promise<string[]> {
    let imageBase64: string;
    let mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";

    if (ext === "svg") {
      // Rasterize SVG → PNG before sending to Claude (vision API doesn't accept SVG)
      const { Resvg } = await import("@resvg/resvg-js");
      const svgText = readFileSync(absPath, "utf-8");
      const resvg = new Resvg(svgText, { fitTo: { mode: "width", value: 256 } });
      imageBase64 = Buffer.from(resvg.render().asPng()).toString("base64");
      mediaType = "image/png";
    } else if (RASTER_MIME[ext]) {
      imageBase64 = readFileSync(absPath).toString("base64");
      mediaType = RASTER_MIME[ext];
    } else {
      // ico, bmp, avif — not supported by Claude vision; skip
      return [];
    }

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    try {
      const match = textBlock.text.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
