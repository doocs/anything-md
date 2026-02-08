# Anything-MD

> 将任意 URL 内容转换为 Markdown — 基于 Cloudflare Workers AI 构建

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/doocs/anything-md)

## 简介

Anything-MD 是一个部署在 [Cloudflare Workers](https://workers.cloudflare.com/) 上的轻量 API 服务。你可以传入一个 URL 让它自动抓取页面内容，或直接传递内容，然后利用 [Workers AI toMarkdown](https://developers.cloudflare.com/workers-ai/features/markdown-conversion/) 将其转换为结构化的 Markdown 文本。

适用于 RAG 数据预处理、LLM 训练语料采集、AI Agent 的网页阅读能力等场景。

## 特性

- 🔗 **URL 转 Markdown** — 传入任意 URL，返回 Markdown 格式内容
- � **直接内容转换** — 无需 URL，直接传递 HTML 或其他内容进行转换
- 📄 **多格式支持** — PDF、HTML、Office 文档、图片、CSV 等均可转换
- 🖼️ **图片智能描述** — 图片内容通过 Workers AI 模型自动生成文字摘要
- 🌐 **CORS 跨域** — 完整的跨域支持,可从任意前端直接调用
- 🔁 **智能重试** — 内置指数退避 + 抖动的重试机制，自动处理瞬态错误
- ⏱️ **请求超时** — 每次请求默认 15s 超时，避免阻塞
- 📝 **HTML 预处理** — 自动处理懒加载图片（`data-src`）、提取页面标题
- ⚡ **零基础设施** — 无需服务器，部署即用，按量计费

## 支持的格式

| 格式 | 扩展名 | MIME 类型 |
|------|--------|-----------|
| PDF | `.pdf` | `application/pdf` |
| 图片 | `.jpeg` `.jpg` `.png` `.webp` `.svg` | `image/jpeg` `image/png` `image/webp` `image/svg+xml` |
| HTML | `.html` `.htm` | `text/html` |
| XML | `.xml` | `application/xml` |
| Microsoft Office | `.xlsx` `.xlsm` `.xlsb` `.xls` `.docx` | `application/vnd.openxmlformats-officedocument.*` |
| OpenDocument | `.ods` `.odt` | `application/vnd.oasis.opendocument.*` |
| CSV | `.csv` | `text/csv` |
| Apple Numbers | `.numbers` | `application/vnd.apple.numbers` |

## API 使用

### GET 请求

```
GET /?url=https://example.com
```

### POST 请求

#### 通过 URL 转换

```bash
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### 直接内容转换

无需提供 URL，直接传递要转换的内容：

```bash
# 转换 HTML 内容
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Hello</h1><p>This is a test.</p></body></html>"
  }'

# 或使用 content 参数，并指定 contentType
curl -X POST https://anything-md.doocs.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<html><body><h1>Hello</h1></body></html>",
    "contentType": "text/html",
    "fileName": "my-page.html"
  }'
```

参数说明：
- `html` / `content`：要转换的内容（二选一）
- `contentType`：内容类型，默认为 `text/html`（可选）
- `fileName`：输出文件名，默认为 `content.html`，HTML 内容会自动提取标题（可选）

### 响应格式

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

### 错误响应

```json
{
  "success": false,
  "error": "Failed to fetch URL: 404 Not Found"
}
```

> 📚 **更多示例**：查看 [API 使用示例文档](docs/api-examples.md) 了解详细的使用案例和各种编程语言示例。

## 项目结构

```
src/
├── index.ts    # Worker 入口 — 路由处理与 toMarkdown 转换
├── config.ts   # 集中配置 — 从环境变量读取所有可调参数
├── cors.ts     # CORS 响应头、JSON/错误响应工具函数
├── fetch.ts    # robustFetch — 带重试、超时、退避的 HTTP 请求
├── html.ts     # HTML 预处理 — 标题提取、懒加载图片修复、转义
└── r2.ts       # R2 图片代理 — 提取、替换、上传微信图片
```

## 快速开始

### 前提条件

- [Node.js](https://nodejs.org/) >= 18
- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)

### 本地开发

```bash
# 克隆项目
git clone https://github.com/doocs/anything-md.git
cd anything-md

# 安装依赖
npm install

# 启动本地开发服务器
npm run dev
```

开发服务器默认运行在 `http://localhost:8787`。

### 部署

```bash
# 登录 Cloudflare（首次使用）
npx wrangler login

# 部署到 Workers
npm run deploy
```

### 其他命令

```bash
# 运行测试
npm test

# 重新生成类型定义
npm run cf-typegen
```

## 配置

所有可调参数均通过 `wrangler.jsonc` 中的 `vars` 配置，用户 clone 后只需修改配置即可部署到自己的 Workers。

本地开发时可复制 `.dev.vars.example` 为 `.dev.vars` 来覆盖配置。

### 核心配置（wrangler.jsonc）

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `name` | Worker 名称，也是子域名前缀 | `anything-md` |
| `ai.binding` | Workers AI 绑定 | `AI` |
| `r2_buckets[0].bucket_name` | R2 存储桶名称 | `anything-md-images` |

### 环境变量（vars）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `R2_PUBLIC_URL` | R2 存储桶的公开访问域名 | — |
| `IMAGE_PROXY_HOSTS` | 允许代理的图片域名后缀，逗号分隔 | `qpic.cn` |
| `IMAGE_TTL_HOURS` | 图片在 R2 中的缓存时长（小时） | `8` |
| `IMAGE_UPLOAD_CONCURRENCY` | 每次请求的最大并发上传数 | `5` |
| `FETCH_TIMEOUT_MS` | 单次 HTTP 请求超时时间（毫秒） | `15000` |
| `FETCH_MAX_ATTEMPTS` | HTTP 请求最大重试次数 | `3` |
| `CORS_ORIGIN` | CORS 允许的来源，`*` 表示全部 | `*` |

### 自行部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/doocs/anything-md.git
cd anything-md

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 创建 R2 存储桶（名称与 wrangler.jsonc 中一致）
npx wrangler r2 bucket create anything-md-images

# 5. 修改 wrangler.jsonc 中的配置
#    - name: 你的 Worker 名称
#    - r2_buckets[0].bucket_name: 你的桶名
#    - vars.R2_PUBLIC_URL: 你的 R2 自定义域名
#    - 其他 vars 按需调整

# 6. 部署
npm run deploy
```

## 许可证

[MIT](LICENSE)
