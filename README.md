# Anything-MD

> 将任意 URL 内容转换为 Markdown — 基于 Cloudflare Workers AI 构建

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/doocs/anything-md)

## 简介

Anything-MD 是一个部署在 [Cloudflare Workers](https://workers.cloudflare.com/) 上的轻量 API 服务。你只需传入一个 URL，它就会自动抓取页面内容，并利用 [Workers AI toMarkdown](https://developers.cloudflare.com/workers-ai/markdown-conversion/) 将其转换为结构化的 Markdown 文本。

适用于 RAG 数据预处理、LLM 训练语料采集、AI Agent 的网页阅读能力等场景。

## 特性

- 🔗 **URL 转 Markdown** — 传入任意 URL，返回 Markdown 格式内容
- 📄 **多格式支持** — PDF、HTML、Office 文档、图片、CSV 等均可转换
- 🖼️ **图片智能描述** — 图片内容通过 Workers AI 模型自动生成文字摘要
- 🌐 **CORS 跨域** — 完整的跨域支持，可从任意前端直接调用
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

```bash
curl -X POST https://anything-md.doocs.workers.dev/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

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

## 项目结构

```
src/
├── index.ts   # Worker 入口 — 路由处理与 toMarkdown 转换
├── cors.ts    # CORS 响应头、JSON/错误响应工具函数
├── fetch.ts   # robustFetch — 带重试、超时、退避的 HTTP 请求
└── html.ts    # HTML 预处理 — 标题提取、懒加载图片修复、转义
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

项目配置位于 `wrangler.jsonc`，关键配置项：

| 配置 | 说明 |
|------|------|
| `name` | Worker 名称，也是子域名前缀 |
| `ai.binding` | Workers AI 绑定，用于调用 `toMarkdown` |
| `compatibility_date` | Workers 运行时兼容日期 |
| `compatibility_flags` | 启用 `nodejs_compat` 以支持 Node.js API |

## 定价

`toMarkdown` 对大多数格式免费。图片转换会使用 Workers AI 模型进行目标检测和摘要生成，超出免费额度后可能产生费用。详见 [Workers AI 定价](https://developers.cloudflare.com/workers-ai/platform/pricing/)。

## 许可证

[MIT](LICENSE)
