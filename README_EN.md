# Anything-MD

> Convert any URL content to Markdown — powered by Cloudflare Workers AI

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/doocs/anything-md)

## Overview

Anything-MD is a lightweight API service running on [Cloudflare Workers](https://workers.cloudflare.com/). Pass in any URL and it will fetch the page content, then convert it to structured Markdown using [Workers AI toMarkdown](https://developers.cloudflare.com/workers-ai/markdown-conversion/).

Great for RAG data preprocessing, LLM training corpus collection, and giving AI Agents the ability to read web pages.

## Features

- 🔗 **URL to Markdown** — Supply any URL, get back Markdown
- 📄 **Multi-format support** — PDF, HTML, Office docs, images, CSV, and more
- 🖼️ **Image summarization** — Images are automatically described using Workers AI models
- 🌐 **CORS enabled** — Full cross-origin support for direct browser calls
- 🔁 **Smart retries** — Built-in exponential back-off with jitter for transient errors
- ⏱️ **Request timeout** — 15s default timeout per request to prevent hanging
- 📝 **HTML preprocessing** — Auto-resolves lazy-loaded images (`data-src`) and extracts page titles
- ⚡ **Zero infrastructure** — No servers needed; deploy and go, pay per request

## Supported Formats

| Format | Extensions | MIME Types |
|--------|-----------|------------|
| PDF | `.pdf` | `application/pdf` |
| Images | `.jpeg` `.jpg` `.png` `.webp` `.svg` | `image/jpeg` `image/png` `image/webp` `image/svg+xml` |
| HTML | `.html` `.htm` | `text/html` |
| XML | `.xml` | `application/xml` |
| Microsoft Office | `.xlsx` `.xlsm` `.xlsb` `.xls` `.docx` | `application/vnd.openxmlformats-officedocument.*` |
| OpenDocument | `.ods` `.odt` | `application/vnd.oasis.opendocument.*` |
| CSV | `.csv` | `text/csv` |
| Apple Numbers | `.numbers` | `application/vnd.apple.numbers` |

## API Usage

### GET Request

```
GET /?url=https://example.com
```

### POST Request

```bash
curl -X POST https://anything-md.doocs.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Success Response

```json
{
  "success": true,
  "url": "https://example.com",
  "name": "page.html",
  "mimeType": "text/html",
  "tokens": 0,
  "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples..."
}
```

### Error Response

```json
{
  "success": false,
  "error": "Failed to fetch URL: 404 Not Found"
}
```

## Project Structure

```
src/
├── index.ts   # Worker entry — routing and toMarkdown conversion
├── cors.ts    # CORS headers, JSON/error response helpers
├── fetch.ts   # robustFetch — HTTP with retries, timeout, and back-off
└── html.ts    # HTML preprocessing — title extraction, lazy-image fix, escaping
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Cloudflare account](https://dash.cloudflare.com/sign-up)

### Local Development

```bash
# Clone the repo
git clone https://github.com/doocs/anything-md.git
cd anything-md

# Install dependencies
npm install

# Start the local dev server
npm run dev
```

The dev server runs at `http://localhost:8787` by default.

### Deploy

```bash
# Log in to Cloudflare (first time)
npx wrangler login

# Deploy to Workers
npm run deploy
```

### Other Commands

```bash
# Run tests
npm test

# Regenerate type definitions
npm run cf-typegen
```

## Configuration

Configuration lives in `wrangler.jsonc`. Key settings:

| Setting | Description |
|---------|-------------|
| `name` | Worker name, also the subdomain prefix |
| `ai.binding` | Workers AI binding for calling `toMarkdown` |
| `compatibility_date` | Workers runtime compatibility date |
| `compatibility_flags` | Enables `nodejs_compat` for Node.js API support |

## Pricing

`toMarkdown` is free for most format conversions. Image conversion uses Workers AI models for object detection and summarization, which may incur charges beyond the free tier. See [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) for details.

## License

[MIT](LICENSE)
