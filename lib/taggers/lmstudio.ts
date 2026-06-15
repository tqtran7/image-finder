import { readFileSync } from "node:fs";
import { DEFAULT_TAG_PROMPT, parseTags } from "@/lib/taggers/prompts";
import type { TagImage } from "@/lib/taggers";

const BASE_URL = (process.env.LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234").replace(/\/$/, "");
const MODEL = process.env.LMSTUDIO_MODEL ?? "local-model";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  error?: { message?: string };
}

export class LMStudioTagger {
  async tag(absPath: string, ext: string, prompt?: string, invert = false, addBlackBackground = false): Promise<string[]> {
    let imageBytes: Buffer;

    if (ext === "svg") {
      const { Resvg } = await import("@resvg/resvg-js");
      const svgText = readFileSync(absPath, "utf-8");
      const resvg = new Resvg(svgText, { fitTo: { mode: "width", value: 256 } });
      imageBytes = Buffer.from(resvg.render().asPng());
    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      imageBytes = readFileSync(absPath);
    } else {
      return [];
    }

    // sharp re-encodes to PNG, so the mime type must follow suit when inverting.
    let mimeType = ext === "svg" || ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";

    if (addBlackBackground) {
      const { flattenToBlack } = await import("@/lib/taggers/invert");
      imageBytes = await flattenToBlack(imageBytes);
      mimeType = "image/png";
    }

    if (invert) {
      const { invertImage } = await import("@/lib/taggers/invert");
      imageBytes = await invertImage(imageBytes);
      mimeType = "image/png";
    }

    return this.tagImageBytes([{ bytes: imageBytes, mediaType: mimeType }], prompt);
  }

  async tagImageBytes(images: TagImage[], prompt?: string): Promise<string[]> {
    const effectivePrompt = prompt?.trim() || DEFAULT_TAG_PROMPT;

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: effectivePrompt },
                ...images.map((img) => ({
                  type: "image_url",
                  image_url: { url: `data:${img.mediaType};base64,${img.bytes.toString("base64")}` },
                })),
              ],
            },
          ],
          stream: false,
        }),
      });
    } catch (err) {
      throw new Error(
        `LM Studio unreachable at ${BASE_URL} — is it running? (${err instanceof Error ? err.message : String(err)})`,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`LM Studio ${response.status}: ${body || response.statusText}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;

    if (data.error?.message) throw new Error(`LM Studio model error: ${data.error.message}`);

    const choice = data.choices?.[0];
    if (choice?.finish_reason === "length") {
      console.warn(
        `[LMStudio] Response was cut off. ` +
        `If using a reasoning model, increase max tokens.`,
      );
    }

    return parseTags(choice?.message?.content ?? "");
  }
}
