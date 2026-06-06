# Image Finder

A local web app for browsing, searching, and AI-tagging image asset libraries. Point it at folders on your machine, let an AI describe every image, then find anything instantly by keyword.

<!-- screenshots go here -->

## Features

- **Folder scanning** — add any local directory as a root; the app recursively indexes every image inside
- **Collections** — group folders into named collections, each with its own custom AI tagging prompt
- **AI auto-tagging** — generate descriptive tags for every image using Claude (Anthropic), Ollama, or LM Studio
- **Full-text search** — search across tags, filenames, and labels in real time
- **Tag editor** — manually add, edit, or remove tags on any image
- **Suggestions panel** — AI-suggested tags you can accept or dismiss in bulk
- **Virtualized grid** — handles libraries with thousands of images without slowdown
- **Dark/light theme** — toggle between themes, preference is persisted
- **SQLite database** — all metadata stored locally in a single file, no server required

## Requirements

- [Node.js](https://nodejs.org) v18+ (v23 recommended)
- One of the following AI backends:
  - **Claude** — an [Anthropic API key](https://console.anthropic.com/settings/keys)
  - **Ollama** — [Ollama](https://ollama.com) running locally with a vision model pulled
  - **LM Studio** — [LM Studio](https://lmstudio.ai) running locally with a vision model loaded and the local server enabled

## Installation

```bash
git clone https://github.com/your-username/image-finder.git
cd image-finder
npm install
```

## Configuration

Copy the example env file and fill in the values for your chosen AI backend:

```bash
cp .env.local.example .env.local
```

### Option A — Claude (Anthropic)

```env
TAGGER_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...

# Optional — defaults to claude-haiku-4-5
TAGGER_MODEL=claude-haiku-4-5
```

### Option B — Ollama

```env
TAGGER_PROVIDER=ollama

# Optional — defaults shown
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llava
```

Pull a vision model first if you haven't already:

```bash
ollama pull llava
```

### Option C — LM Studio

```env
TAGGER_PROVIDER=lmstudio

# Optional — defaults shown
LMSTUDIO_BASE_URL=http://127.0.0.1:1234
LMSTUDIO_MODEL=qwen/qwen2.5-vl-7b
```

Make sure the **local server** is enabled in LM Studio (Server tab → Start Server) and a vision-capable model is loaded.

## Running

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

For a production build:

```bash
npm run build
npm start
```

## Usage

1. **Add a folder** — click "Add Folder" and enter an absolute path to a directory containing images
2. **Scan** — the app indexes all images found recursively
3. **Auto-tag** — select images and click "Auto Tag", or tag an entire collection at once
4. **Search** — type in the search bar to filter by tag, filename, or label
5. **Collections** — create collections to group related folders and give each its own tagging prompt

## Supported Image Formats

`png` `jpg` / `jpeg` `gif` `webp` `svg`

> `ico`, `bmp`, and `avif` are not supported by most vision models and are skipped during tagging.
