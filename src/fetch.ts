/**
 * HTTP fetch utilities
 * A robust fetch wrapper with configurable retries, exponential back-off,
 * request timeout, and transient-error awareness.
 */

export interface FetchOptions {
	/** Max number of attempts (default: 3) */
	maxAttempts?: number;
	/** Base delay between retries in ms (default: 800) */
	baseDelay?: number;
	/** Per-request timeout in ms (default: 15000) */
	timeout?: number;
	/** Override the default Referer header */
	referer?: string;
	/** Extra headers to merge in */
	headers?: Record<string, string>;
}

const DEFAULTS: Required<Pick<FetchOptions, 'maxAttempts' | 'baseDelay' | 'timeout'>> = {
	maxAttempts: 3,
	baseDelay: 800,
	timeout: 15_000,
};

/** HTTP status codes that are safe to retry */
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/** Browser-like default headers */
function defaultHeaders(referer: string): Record<string, string> {
	return {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.9',
		'Cache-Control': 'no-cache',
		Referer: referer,
	};
}

/** Sleep for a jittered duration to spread out retries */
function sleep(base: number, attempt: number): Promise<void> {
	const exponential = base * 2 ** (attempt - 1);
	const jitter = exponential * (0.5 + Math.random() * 0.5);
	return new Promise((r) => setTimeout(r, Math.round(jitter)));
}

/**
 * Fetch a URL with automatic retries, timeout, and exponential back-off.
 *
 * Retries on network errors **and** transient HTTP status codes (408, 429, 5xx).
 * Each request is guarded by an `AbortSignal.timeout` so slow responses
 * don't block indefinitely.
 */
export async function robustFetch(url: string, opts: FetchOptions = {}): Promise<Response> {
	const { maxAttempts, baseDelay, timeout } = { ...DEFAULTS, ...opts };

	const origin = new URL(url);
	const referer = opts.referer ?? `${origin.protocol}//${origin.hostname}`;
	const headers = { ...defaultHeaders(referer), ...opts.headers };

	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const response = await fetch(url, {
				headers,
				redirect: 'follow',
				signal: AbortSignal.timeout(timeout),
			});

			// Retry on transient server errors (but not on the last attempt)
			if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
				console.log(`Transient ${response.status} on attempt ${attempt}/${maxAttempts}, will retry`);
				await sleep(baseDelay, attempt);
				continue;
			}

			return response;
		} catch (err) {
			lastError = err;
			if (attempt < maxAttempts) {
				const msg = err instanceof Error ? err.message : String(err);
				console.log(`Fetch error on attempt ${attempt}/${maxAttempts}: ${msg}`);
				await sleep(baseDelay, attempt);
			}
		}
	}

	throw lastError ?? new Error(`Failed to fetch ${url} after ${maxAttempts} attempts`);
}
