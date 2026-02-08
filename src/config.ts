/**
 * Centralised configuration
 *
 * All tuneable knobs that a deployer may want to change live here.
 * Values are read from `env` (wrangler.jsonc `vars`) at runtime so they
 * can be overridden per-environment without touching source code.
 *
 * Each helper falls back to a sensible default when the env var is absent.
 */

// ---------------------------------------------------------------------------
// Image proxy
// ---------------------------------------------------------------------------

/** Hostname suffixes allowed for image proxying (comma-separated in env) */
export function allowedImageHosts(env: Env): string[] {
	const raw = env.IMAGE_PROXY_HOSTS;
	return raw
		? raw
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
		: ['qpic.cn'];
}

/** TTL for cached images in milliseconds */
export function imageTtlMs(env: Env): number {
	const hours = Number(env.IMAGE_TTL_HOURS) || 8;
	return hours * 60 * 60 * 1000;
}

/** Max parallel image uploads per request */
export function imageUploadConcurrency(env: Env): number {
	return Number(env.IMAGE_UPLOAD_CONCURRENCY) || 5;
}

/** Cache-Control max-age for R2 objects (seconds) */
export function imageCacheMaxAge(env: Env): number {
	const hours = Number(env.IMAGE_TTL_HOURS) || 8;
	return hours * 60 * 60;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

/** Default fetch timeout in milliseconds */
export function fetchTimeout(env: Env): number {
	return Number(env.FETCH_TIMEOUT_MS) || 15_000;
}

/** Default max fetch attempts */
export function fetchMaxAttempts(env: Env): number {
	return Number(env.FETCH_MAX_ATTEMPTS) || 3;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/** Allowed CORS origin (default: "*") */
export function corsOrigin(env: Env): string {
	return env.CORS_ORIGIN || '*';
}
