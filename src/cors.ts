/**
 * CORS utilities
 * Provides cross-origin response headers and preflight handling.
 */

import { corsOrigin } from './config';

/** Build CORS headers using the configured origin */
export function getCorsHeaders(env: Env): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': corsOrigin(env),
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}

/** Build a JSON response with CORS headers */
export function jsonResponse(env: Env, data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data, null, 2), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			...getCorsHeaders(env),
		},
	});
}

/** Build a plain-text response with CORS headers */
export function textResponse(env: Env, text: string, status = 200): Response {
	return new Response(text, {
		status,
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			...getCorsHeaders(env),
		},
	});
}

/** Shorthand for an error JSON response */
export function errorResponse(env: Env, message: string, status = 400): Response {
	return jsonResponse(env, { success: false, error: message }, status);
}

/** Handle CORS preflight (OPTIONS) request */
export function handlePreflight(env: Env): Response {
	return new Response(null, { status: 204, headers: getCorsHeaders(env) });
}
