/**
 * Anything-MD Worker
 *
 * Entry point for the Cloudflare Worker that converts any URL content
 * to Markdown via the Workers AI toMarkdown binding.
 *
 * API:
 *   GET  /?url=https://example.com
 *   POST / { "url": "https://example.com" }
 *
 * Response: { success, url, name, mimeType, tokens, markdown }
 */

import { handlePreflight, jsonResponse, errorResponse } from './cors';
import { robustFetch } from './fetch';
import { extractTitle, preprocessHtml } from './html';
import { collectImageUrls, rewriteImageUrls, uploadImages } from './r2';
import { fetchTimeout, fetchMaxAttempts } from './config';

/** Derive a filename from a URL path */
function getFileName(url: string): string {
	try {
		const segment = new URL(url).pathname.split('/').filter(Boolean).pop();
		if (segment?.includes('.')) return segment;
		return segment ? `${segment}.html` : 'page.html';
	} catch {
		return 'page.html';
	}
}

/** Determine whether the content type is HTML */
function isHtmlContent(contentType: string): boolean {
	return contentType.includes('text/html') || contentType.includes('application/xhtml');
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// CORS preflight
		if (request.method === 'OPTIONS') {
			return handlePreflight(env);
		}

		// --- Parse target URL from request ---
		let targetUrl: string | null = null;

		if (request.method === 'GET') {
			targetUrl = new URL(request.url).searchParams.get('url');
		} else if (request.method === 'POST') {
			try {
				const body = (await request.json()) as { url?: string };
				targetUrl = body.url ?? null;
			} catch {
				return errorResponse(env, 'Invalid JSON body. Expected: { "url": "https://..." }');
			}
		} else {
			return errorResponse(env, 'Method not allowed. Use GET or POST.', 405);
		}

		// No URL provided — return usage info
		if (!targetUrl) {
			return jsonResponse(env, {
				success: true,
				message: 'Anything-MD API — Convert any URL to Markdown',
				usage: {
					GET: '/?url=https://example.com',
					POST: '/ with JSON body { "url": "https://example.com" }',
				},
			});
		}

		// Validate URL format
		try {
			new URL(targetUrl);
		} catch {
			return errorResponse(env, 'Invalid URL provided.');
		}

		try {
			// Fetch remote content with retry
			const response = await robustFetch(targetUrl, {
				timeout: fetchTimeout(env),
				maxAttempts: fetchMaxAttempts(env),
			});

			if (!response.ok) {
				return errorResponse(env, `Failed to fetch URL: ${response.status} ${response.statusText}`, 502);
			}

			const contentType = response.headers.get('content-type') || 'application/octet-stream';
			let body = await response.arrayBuffer();
			let fileName = getFileName(targetUrl);

			// For HTML content: preprocess lazy images and extract a better title
			if (isHtmlContent(contentType)) {
				const rawHtml = new TextDecoder().decode(body);
				const processed = preprocessHtml(rawHtml);
				body = new TextEncoder().encode(processed).buffer as ArrayBuffer;

				const title = extractTitle(rawHtml, fileName.replace(/\.html$/, ''));
				fileName = `${title}.html`;
			}

			// Convert to Markdown via Workers AI
			const results = await env.AI.toMarkdown([
				{
					name: fileName,
					blob: new Blob([body], { type: contentType }),
				},
			]);

			const result = results[0];

			if (result.format === 'error') {
				return errorResponse(env, `Conversion failed: ${result.error}`, 422);
			}

			let markdown = result.data ?? '';

			// Proxy WeChat images through R2 (if configured)
			const rawHtmlForImages = isHtmlContent(contentType)
				? new TextDecoder().decode(body)
				: '';

			if (env.IMAGES_BUCKET && env.R2_PUBLIC_URL) {
				const imageUrls = collectImageUrls(rawHtmlForImages, markdown);
				if (imageUrls.length > 0) {
					markdown = rewriteImageUrls(markdown, imageUrls, env.R2_PUBLIC_URL, env);
					// Upload in the background — does not block the response
					ctx.waitUntil(uploadImages(imageUrls, env.IMAGES_BUCKET, env));
				}
			}

			return jsonResponse(env, {
				success: true,
				url: targetUrl,
				name: result.name,
				mimeType: result.mimeType,
				tokens: result.tokens,
				markdown,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResponse(env, `Internal error: ${message}`, 500);
		}
	},
} satisfies ExportedHandler<Env>;
