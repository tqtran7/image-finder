import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { DEFAULT_TAG_PROMPT, parseTags } from "@/lib/taggers/prompts";
import type { TagImage } from "@/lib/taggers";

type ClaudeMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

const MODEL = process.env.TAGGER_MODEL ?? "claude-haiku-4-5";

const RASTER_MIME: Record<string, "image/png" | "image/jpeg" | "image/gif" | "image/webp"> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export class ClaudeTagger {
  private client = new Anthropic();

  async tag(absPath: string, ext: string, prompt?: string, invert = false, addBlackBackground = false): Promise<string[]> {
    let imageBytes: Buffer;
    let mediaType: ClaudeMediaType;

    if (ext === "svg") {
      // Rasterize SVG → PNG before sending to Claude (vision API doesn't accept SVG)
      const { Resvg } = await import("@resvg/resvg-js");
      const svgText = readFileSync(absPath, "utf-8");
      const resvg = new Resvg(svgText, { fitTo: { mode: "width", value: 256 } });
      imageBytes = Buffer.from(resvg.render().asPng());
      mediaType = "image/png";
    } else if (RASTER_MIME[ext]) {
      imageBytes = readFileSync(absPath);
      mediaType = RASTER_MIME[ext];
    } else {
      // ico, bmp, avif — not supported by Claude vision; skip
      return [];
    }

    if (addBlackBackground) {
      const { flattenToBlack } = await import("@/lib/taggers/invert");
      imageBytes = await flattenToBlack(imageBytes);
      mediaType = "image/png";
    }

    if (invert) {
      // sharp re-encodes to PNG, so the media type must follow suit.
      const { invertImage } = await import("@/lib/taggers/invert");
      imageBytes = await invertImage(imageBytes);
      mediaType = "image/png";
    }

    return this.tagImageBytes([{ bytes: imageBytes, mediaType }], prompt);
  }

  async tagImageBytes(images: TagImage[], prompt?: string): Promise<string[]> {
    const effectivePrompt = prompt?.trim() || DEFAULT_TAG_PROMPT;

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: img.mediaType as ClaudeMediaType,
                data: img.bytes.toString("base64"),
              },
            })),
            { type: "text" as const, text: effectivePrompt },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];
    return parseTags(textBlock.text);
  }
}
