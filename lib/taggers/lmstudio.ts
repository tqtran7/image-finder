import { readFileSync } from "node:fs";
import { DEFAULT_TAG_PROMPT } from "@/lib/taggers/prompts";

const BASE_URL = (process.env.LMSTUDIO_BASE_URL ?? "http://127.0.0.1:1234").replace(/\/$/, "");
const MODEL = process.env.LMSTUDIO_MODEL ?? "local-model";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export class LMStudioTagger {
  async tag(absPath: string, ext: string, prompt?: string): Promise<string[]> {
    const effectivePrompt = prompt?.trim() || DEFAULT_TAG_PROMPT;
    let imageBase64: string;

    if (ext === "svg") {
      const { Resvg } = await import("@resvg/resvg-js");
      const svgText = readFileSync(absPath, "utf-8");
      const resvg = new Resvg(svgText, { fitTo: { mode: "width", value: 256 } });
      imageBase64 = Buffer.from(resvg.render().asPng()).toString("base64");
    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      imageBase64 = readFileSync(absPath).toString("base64");
    } else {
      return [];
    }

    const mimeType = ext === "svg" || ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg";

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
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              ],
            },
          ],
          max_tokens: 512,
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

    const text = data.choices?.[0]?.message?.content ?? "";

    try {
      const match = text.match(/\[[\s\S]*\]/);
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
