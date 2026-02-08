/**
 * R2 image proxy module
 *
 * Handles temporary caching of WeChat (qpic.cn) images in Cloudflare R2.
 *
 * Design:
 *  - Allowlist: only proxies images from qpic.cn domains.
 *  - Deterministic keys: R2 object key is derived from the URL so the same
 *    image always maps to the same key (no duplicates).
 *  - TTL metadata: each object carries an `expiresAt` custom metadata field
 *    (default 8 h). A separate scheduled handler or lifecycle rule can clean
 *    up expired objects.
 *  - Non-blocking upload: callers use `ctx.waitUntil()` so the response is
 *    returned immediately while uploads happen in the background.
 */

import { allowedImageHosts, imageCacheMaxAge, imageTtlMs, imageUploadConcurrency } from './config';
import { robustFetch } from './fetch';

/** Map content-type fragments to file extensions */
const MIME_TO_EXT: Record<string, string> = {
	png: 'png',
	gif: 'gif',
	webp: 'webp',
	svg: 'svg',
	jpeg: 'jpg',
	jpg: 'jpg',
};

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Check whether a URL belongs to the configured image host allowlist */
export function isAllowedImageHost(url: string, env: Env): boolean {
	try {
		const hostname = new URL(url).hostname;
		return allowedImageHosts(env).some((suffix) => hostname.endsWith(suffix));
	} catch {
		return false;
	}
}

/**
 * Infer a file extension from a WeChat image URL.
 *
 * Priority: `wx_fmt` query param > path hint (`_png`, `_gif`, …) > default `jpg`.
 */
function inferExtension(url: URL): string {
	const fmt = url.searchParams.get('wx_fmt');
	if (fmt) return MIME_TO_EXT[fmt] ?? fmt;

	const path = url.pathname;
	for (const [hint, ext] of Object.entries(MIME_TO_EXT)) {
		if (path.includes(`_${hint}`)) return ext;
	}
	return 'jpg';
}

/**
 * Derive a deterministic R2 object key from an image URL.
 *
 * Example:
 *   https://mmbiz.qpic.cn/sz_mmbiz_png/abc/640?wx_fmt=png
 *   → mmbiz_qpic_cn/sz_mmbiz_png/abc/640.png
 *
 * Returns `null` for non-allowlisted URLs.
 */
export function toR2Key(originalUrl: string, env: Env): string | null {
	try {
		const url = new URL(originalUrl);
		const hosts = allowedImageHosts(env);
		if (!hosts.some((suffix) => url.hostname.endsWith(suffix))) return null;

		const prefix = url.hostname.replace(/\./g, '_');
		const path = url.pathname.replace(/^\//, '');
		const ext = inferExtension(url);

		return `${prefix}/${path}.${ext}`;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Extraction & replacement
// ---------------------------------------------------------------------------

/** Regex that matches WeChat image URLs (mmbiz.qpic.cn / mmbiz.qlogo.cn) */
const WECHAT_IMG_RE = /https?:\/\/mmbiz\.q(?:pic|logo)\.cn\/[^?\s"'<>)\]]+(?:\?[^&\s"'<>)\]]+)?/gi;

/**
 * Collect all unique WeChat image URLs from both raw HTML and converted Markdown.
 */
export function collectImageUrls(html: string, markdown: string): string[] {
	const matches = new Set<string>();
	for (const m of html.matchAll(WECHAT_IMG_RE)) matches.add(m[0]);
	for (const m of markdown.matchAll(WECHAT_IMG_RE)) matches.add(m[0]);

	// Strip trailing punctuation that may have been captured
	return [...matches].map((u) => u.replace(/[,.)\]]+$/, ''));
}

/**
 * Replace all WeChat image URLs in a Markdown string with their R2 public URLs.
 *
 * This is a **synchronous, pure** function — it only rewrites strings and does
 * not perform any I/O.  The actual upload happens separately via `uploadImages`.
 *
 * @param markdown    - Markdown text to transform
 * @param imageUrls   - WeChat image URLs previously collected
 * @param r2PublicUrl - Public base URL of the R2 bucket (no trailing slash)
 */
export function rewriteImageUrls(markdown: string, imageUrls: string[], r2PublicUrl: string, env: Env): string {
	if (imageUrls.length === 0) return markdown;

	let result = markdown;

	for (const originalUrl of imageUrls) {
		const key = toR2Key(originalUrl, env);
		if (!key) continue;

		const replacement = `${r2PublicUrl}/${key}`;
		const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Match the URL followed by optional HTML-entity query params (&amp;…)
		result = result.replace(new RegExp(`${escaped}(?:&amp;[^)\\s"'<>\\]]+)*`, 'g'), replacement);
		// Also match plain & params
		result = result.replace(new RegExp(`${escaped}(?:&[^)\\s"'<>\\]]+)*`, 'g'), replacement);
	}

	return result;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/** Resolve extension from a Content-Type header value */
function extFromContentType(ct: string): string {
	for (const [fragment, ext] of Object.entries(MIME_TO_EXT)) {
		if (ct.includes(fragment)) return ext;
	}
	return 'jpg';
}

/**
 * Download and upload a batch of WeChat images to R2.
 *
 * Already-existing keys are skipped (head check).  Downloads use a WeChat
 * Referer to bypass hotlink protection.
 *
 * Designed to be called inside `ctx.waitUntil()` so it runs in the background.
 */
export async function uploadImages(
	imageUrls: string[],
	bucket: R2Bucket,
	env: Env,
): Promise<{ uploaded: number; skipped: number; failed: number }> {
	const stats = { uploaded: 0, skipped: 0, failed: 0 };
	if (imageUrls.length === 0) return stats;

	const concurrency = imageUploadConcurrency(env);
	const ttl = imageTtlMs(env);
	const cacheMaxAge = imageCacheMaxAge(env);

	// Process in batches to limit concurrency
	for (let i = 0; i < imageUrls.length; i += concurrency) {
		const batch = imageUrls.slice(i, i + concurrency);

		const results = await Promise.allSettled(
			batch.map(async (url) => {
				const key = toR2Key(url, env);
				if (!key) {
					stats.skipped++;
					return;
				}

				// Skip if already cached
				if (await bucket.head(key)) {
					stats.skipped++;
					return;
				}

				// Download with WeChat Referer
				const res = await robustFetch(url, {
					referer: 'https://mp.weixin.qq.com/',
					headers: { Accept: 'image/*,*/*;q=0.8' },
					maxAttempts: 2,
					timeout: 10_000,
				});

				if (!res.ok) {
					console.log(`Image download failed (${res.status}): ${url}`);
					stats.failed++;
					return;
				}

				const ct = res.headers.get('content-type') ?? 'image/jpeg';
				const data = await res.arrayBuffer();

				await bucket.put(key, data, {
					httpMetadata: {
						contentType: ct,
						cacheControl: `public, max-age=${cacheMaxAge}`,
					},
					customMetadata: {
						expiresAt: new Date(Date.now() + ttl).toISOString(),
						originalUrl: url,
						extension: extFromContentType(ct),
					},
				});

				console.log(`Uploaded to R2: ${key} (${data.byteLength} bytes)`);
				stats.uploaded++;
			}),
		);

		// Log any unexpected rejections
		for (const r of results) {
			if (r.status === 'rejected') {
				console.log(`Upload error: ${r.reason}`);
				stats.failed++;
			}
		}
	}

	console.log(`R2 upload complete — uploaded: ${stats.uploaded}, skipped: ${stats.skipped}, failed: ${stats.failed}`);
	return stats;
}
