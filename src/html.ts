/**
 * HTML processing utilities
 * Title extraction, content escaping, and lazy-image preprocessing.
 */

/**
 * Extract a meaningful page title from raw HTML.
 *
 * Priority: og:title > twitter:title > <title> tag > fallback.
 * The result is sanitised for safe use as a filename.
 *
 * @param html       - Raw HTML string
 * @param fallbackId - Fallback identifier when no title is found
 */
export function extractTitle(html: string, fallbackId: string): string {
	const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']\s*\/?>/i);
	const twTitle = html.match(/<meta\s+property=["']twitter:title["']\s+content=["'](.*?)["']\s*\/?>/i);
	const tagTitle = html.match(/<title>(.*?)<\/title>/i);

	let title = '';
	if (ogTitle?.[1]) {
		title = ogTitle[1].trim();
	} else if (twTitle?.[1]) {
		title = twTitle[1].trim();
	} else if (tagTitle?.[1]) {
		title = tagTitle[1].trim();
	} else {
		title = `page-${fallbackId}`;
	}

	// Sanitise: replace whitespace, strip unsafe chars, limit length
	return title
		.replace(/\s+/g, '_')
		.replace(/[\\/:*?"<>|]/g, '')
		.replace(/[^\w\u4e00-\u9fa5_\-.]/g, '')
		.substring(0, 100);
}

/** Escape HTML special characters in text content */
export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/** Escape a value for use inside an HTML double-quoted attribute */
export function escapeHtmlAttr(unsafe: string): string {
	return unsafe.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Preprocess HTML to resolve lazy-loaded images.
 *
 * Many sites (e.g. WeChat articles) store the real image URL in `data-src`
 * while leaving `src` empty or set to a placeholder. This function copies
 * `data-src` into `src` so that downstream converters can see the images.
 */
export function preprocessHtml(html: string): string {
	return html.replace(/<img\s+([^>]*?)data-src=["']([^"']+)["']([^>]*)>/gi, (match, before, dataSrc, after) => {
		const attrs = before + after;
		const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
		const srcValue = srcMatch?.[1] ?? '';

		// Only replace if src is empty or a data-URI placeholder
		if (!srcValue || srcValue.startsWith('data:')) {
			const cleanBefore = before.replace(/src=["'][^"']*["']\s*/gi, '');
			const cleanAfter = after.replace(/src=["'][^"']*["']\s*/gi, '');
			const safeSrc = escapeHtmlAttr(dataSrc);
			return `<img ${cleanBefore}src="${safeSrc}" data-src="${safeSrc}"${cleanAfter}>`;
		}

		return match;
	});
}
