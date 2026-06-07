import { readFileSync } from "node:fs";
import { DEFAULT_TAG_PROMPT } from "@/lib/taggers/prompts";

const BASE_URL = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
const MODEL = process.env.OLLAMA_MODEL ?? "llava";

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export class OllamaTagger {
  async tag(absPath: string, ext: string, prompt?: string): Promise<string[]> {
    const effectivePrompt = prompt?.trim() || DEFAULT_TAG_PROMPT;
    let imageBase64: string;

    if (ext === "svg") {
      // Rasterize SVG → PNG (Ollama vision models don't accept raw SVG)
      const { Resvg } = await import("@resvg/resvg-js");
      const svgText = readFileSync(absPath, "utf-8");
      const resvg = new Resvg(svgText, { fitTo: { mode: "width", value: 256 } });
      imageBase64 = Buffer.from(resvg.render().asPng()).toString("base64");
    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      imageBase64 = readFileSync(absPath).toString("base64");
    } else {
      // ico, bmp, avif — not reliably supported; skip
      return [];
    }

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
              images: [imageBase64],
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

    const text = data.message?.content ?? "";

    try {
      const match = text.match(/\[[\s\S]*?\]/);
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
}
