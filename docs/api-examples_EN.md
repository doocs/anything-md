# API Usage Examples

## 1. Convert via URL

### GET Request
```bash
curl "https://anything-md.doocs.org/?url=https://example.com"
```

### POST Request
```bash
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 2. Direct Content Conversion

### Simple HTML Conversion
```bash
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><head><title>Example</title></head><body><h1>Hello World</h1><p>This is a test.</p></body></html>"
  }'
```

### Using the `content` Parameter
```bash
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<html><body><h1>Test Page</h1><p>Content here.</p></body></html>",
    "contentType": "text/html",
    "fileName": "test-page.html"
  }'
```

### JavaScript Example
```javascript
// Method 1: Using the html parameter
const response1 = await fetch('https://anything-md.doocs.org/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    html: '<html><body><h1>Hello</h1></body></html>'
  })
});

// Method 2: Using the content parameter
const response2 = await fetch('https://anything-md.doocs.org/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '<html><body><h1>Hello</h1></body></html>',
    contentType: 'text/html',
    fileName: 'my-page.html'
  })
});

const data = await response2.json();
console.log(data.markdown);
```

### Python Example
```python
import requests

# Using the html parameter
response = requests.post('https://anything-md.doocs.org/', json={
    'html': '<html><body><h1>Hello</h1><p>World</p></body></html>'
})

print(response.json()['markdown'])

# Using the content parameter
response = requests.post('https://anything-md.doocs.org/', json={
    'content': '<html><body><h1>Custom Title</h1></body></html>',
    'contentType': 'text/html',
    'fileName': 'custom.html'
})

print(response.json())
```

## 3. Get Raw Markdown (Without JSON Wrapping)

```bash
# Via URL
curl "https://anything-md.doocs.org/?url=https://example.com&format=raw"

# Direct content
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Hello</h1></body></html>",
    "format": "raw"
  }'
```

## Response Format

### JSON Response (Default)
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

### Raw Markdown (format=raw)
```markdown
# Example Domain

This domain is for use in illustrative examples...
```

## Parameter Reference

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | No* | URL of the page to convert |
| `content` / `html` | string | No* | Content to convert directly (use one or the other) |
| `contentType` | string | No | Content MIME type, defaults to `text/html` |
| `fileName` | string | No | Output file name; for HTML the title is extracted automatically |
| `format` | string | No | Set to `raw` to return plain Markdown text instead of JSON |

*Note: Either `url` or `content`/`html` must be provided.
