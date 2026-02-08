/**
 * CORS utilities
 * Provides cross-origin response headers and preflight handling.
 */

export const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400',
};

/** Build a JSON response with CORS headers */
export function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			...CORS_HEADERS,
		},
	});
}

/** Shorthand for an error JSON response */
export function errorResponse(message: string, status = 400): Response {
	return jsonResponse({ success: false, error: message }, status);
}

/** Handle CORS preflight (OPTIONS) request */
export function handlePreflight(): Response {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
}
