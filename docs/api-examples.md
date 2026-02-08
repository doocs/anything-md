# API 使用示例

## 1. 通过 URL 转换

### GET 请求
```bash
curl "https://anything-md.doocs.org/?url=https://example.com"
```

### POST 请求
```bash
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 2. 直接内容转换

### 简单 HTML 转换
```bash
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><head><title>Example</title></head><body><h1>Hello World</h1><p>This is a test.</p></body></html>"
  }'
```

### 使用 content 参数
```bash
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<html><body><h1>Test Page</h1><p>Content here.</p></body></html>",
    "contentType": "text/html",
    "fileName": "test-page.html"
  }'
```

### JavaScript 示例
```javascript
// 方式 1: 使用 html 参数
const response1 = await fetch('https://anything-md.doocs.org/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    html: '<html><body><h1>Hello</h1></body></html>'
  })
});

// 方式 2: 使用 content 参数
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

### Python 示例
```python
import requests

# 使用 html 参数
response = requests.post('https://anything-md.doocs.org/', json={
    'html': '<html><body><h1>Hello</h1><p>World</p></body></html>'
})

print(response.json()['markdown'])

# 使用 content 参数
response = requests.post('https://anything-md.doocs.org/', json={
    'content': '<html><body><h1>Custom Title</h1></body></html>',
    'contentType': 'text/html',
    'fileName': 'custom.html'
})

print(response.json())
```

## 3. 获取原始 Markdown（无 JSON 封装）

```bash
# 通过 URL
curl "https://anything-md.doocs.org/?url=https://example.com&format=raw"

# 直接内容
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Hello</h1></body></html>",
    "format": "raw"
  }'
```

## 响应格式

### JSON 响应（默认）
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

### 原始 Markdown（format=raw）
```markdown
# Example Domain

This domain is for use in illustrative examples...
```

## 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 否* | 要转换的 URL 地址 |
| `content` / `html` | string | 否* | 直接提供的内容（二选一） |
| `contentType` | string | 否 | 内容类型，默认 `text/html` |
| `fileName` | string | 否 | 输出文件名，HTML 会自动提取标题 |
| `format` | string | 否 | 设置为 `raw` 可直接返回 Markdown 文本 |

*注：`url` 和 `content`/`html` 必须提供其中一个
