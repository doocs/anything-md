import { createExecutionContext, env, SELF, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const usage = `{
  "success": true,
  "message": "Anything-MD API — Convert any URL or content to Markdown",
  "usage": {
    "GET": "/?url=https://example.com",
    "POST_URL": "{ \\"url\\": \\"https://example.com\\" }",
    "POST_CONTENT": "{ \\"content\\": \\"<html>...</html>\\", \\"contentType\\": \\"text/html\\", \\"fileName\\": \\"page.html\\" }",
    "POST_HTML": "{ \\"html\\": \\"<html>...</html>\\" }"
  }
}`;

describe('Anything-MD worker', () => {
  it('describes the API when no URL is provided (unit style)', async () => {
    const request = new IncomingRequest('http://example.com');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await response.text()).toBe(usage);
  });

  it('describes the API when no URL is provided (integration style)', async () => {
    const response = await SELF.fetch('https://example.com');
    expect(await response.text()).toBe(usage);
  });
});
