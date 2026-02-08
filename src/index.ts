/**
 * Anything-MD: Convert any URL content to Markdown using Cloudflare Workers AI
 *
 * API Usage:
 *   GET  /?url=https://example.com
 *   POST / { "url": "https://example.com" }
 *
 * Returns JSON: { "success": true, "url": "...", "name": "...", "markdown": "...", "tokens": 0, "mimeType": "..." }
 */

const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			...CORS_HEADERS,
		},
	});
}

function errorResponse(message: string, status = 400): Response {
	return jsonResponse({ success: false, error: message }, status);
}

/** Extract a reasonable filename from a URL */
function getFileName(url: string): string {
	try {
		const pathname = new URL(url).pathname;
		const lastSegment = pathname.split('/').filter(Boolean).pop();
		if (lastSegment && lastSegment.includes('.')) {
			return lastSegment;
		}
		// Default to .html for web pages without an extension
		return lastSegment ? `${lastSegment}.html` : 'page.html';
	} catch {
		return 'page.html';
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		// Parse the URL parameter
		let targetUrl: string | null = null;

		if (request.method === 'GET') {
			const params = new URL(request.url).searchParams;
			targetUrl = params.get('url');
		} else if (request.method === 'POST') {
			try {
				const body = (await request.json()) as { url?: string };
				targetUrl = body.url ?? null;
			} catch {
				return errorResponse('Invalid JSON body. Expected: { "url": "https://..." }');
			}
		} else {
			return errorResponse('Method not allowed. Use GET or POST.', 405);
		}

		if (!targetUrl) {
			return jsonResponse({
				success: true,
				message: 'Anything-MD API — Convert any URL to Markdown',
				usage: {
					GET: '/?url=https://example.com',
					POST: '/ with JSON body { "url": "https://example.com" }',
				},
			});
		}

		// Validate URL
		try {
			new URL(targetUrl);
		} catch {
			return errorResponse('Invalid URL provided.');
		}

		try {
			// Fetch the remote content
			const response = await fetch(targetUrl, {
				headers: {
					'User-Agent': 'Anything-MD/1.0 (Cloudflare Workers)',
					'Accept': '*/*',
				},
				redirect: 'follow',
			});

			if (!response.ok) {
				return errorResponse(`Failed to fetch URL: ${response.status} ${response.statusText}`, 502);
			}

			const contentType = response.headers.get('content-type') || 'application/octet-stream';
			const arrayBuffer = await response.arrayBuffer();
			const fileName = getFileName(targetUrl);

			// Convert to Markdown using Workers AI
			const results = await env.AI.toMarkdown([
				{
					name: fileName,
					blob: new Blob([arrayBuffer], { type: contentType }),
				},
			]);

			const result = results[0];

			if (result.format === 'error') {
				return errorResponse(`Conversion failed: ${result.error}`, 422);
			}

			return jsonResponse({
				success: true,
				url: targetUrl,
				name: result.name,
				mimeType: result.mimeType,
				tokens: result.tokens,
				markdown: result.data,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return errorResponse(`Internal error: ${message}`, 500);
		}
	},
} satisfies ExportedHandler<Env>;
