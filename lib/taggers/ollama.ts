import { readFileSync } from "node:fs";
import { DEFAULT_TAG_PROMPT, parseTags } from "@/lib/taggers/prompts";
import type { TagImage } from "@/lib/taggers";

const BASE_URL = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
const MODEL = process.env.OLLAMA_MODEL ?? "llava";

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export class OllamaTagger {
  async tag(absPath: string, ext: string, prompt?: string, invert = false, addBlackBackground = false): Promise<string[]> {
    let imageBytes: Buffer;

    if (ext === "svg") {
      // Rasterize SVG → PNG (Ollama vision models don't accept raw SVG)
      const { Resvg } = await import("@resvg/resvg-js");
      const svgText = readFileSync(absPath, "utf-8");
      const resvg = new Resvg(svgText, { fitTo: { mode: "width", value: 256 } });
      imageBytes = Buffer.from(resvg.render().asPng());
    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      imageBytes = readFileSync(absPath);
    } else {
      // ico, bmp, avif — not reliably supported; skip
      return [];
    }

    if (addBlackBackground) {
      const { flattenToBlack } = await import("@/lib/taggers/invert");
      imageBytes = await flattenToBlack(imageBytes);
    }

    if (invert) {
      const { invertImage } = await import("@/lib/taggers/invert");
      imageBytes = await invertImage(imageBytes);
    }

    // Ollama only needs the base64 bytes; the media type is irrelevant to it.
    return this.tagImageBytes([{ bytes: imageBytes, mediaType: "image/png" }], prompt);
  }

  async tagImageBytes(images: TagImage[], prompt?: string): Promise<string[]> {
    const effectivePrompt = prompt?.trim() || DEFAULT_TAG_PROMPT;

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: effectivePrompt,
              images: images.map((img) => img.bytes.toString("base64")),
            },
          ],
          stream: false,
        }),
      });
    } catch (err) {
      throw new Error(
        `Ollama unreachable at ${BASE_URL} — is it running? (${err instanceof Error ? err.message : String(err)})`,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama ${response.status}: ${body || response.statusText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    if (data.error) throw new Error(`Ollama model error: ${data.error}`);

    return parseTags(data.message?.content ?? "");
  }
}
