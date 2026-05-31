<div align="center">

<img src="docs/assets/logo-banner.svg" alt="AI Relay" width="400">

**无服务器 AI API 中转网关：一键部署到 Vercel，或通过 GitHub Actions 自动部署到 Cloudflare**

<h3>🚀 <a href="https://vercel.com/new/clone?repository-url=https://github.com/MoyuFamily/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/MoyuFamily/ai-relay#environment-variables">一键部署到 Vercel，2 分钟上线你的 AI API 网关</a> · <a href="#-部署到-cloudflare-pages全自动">部署到 Cloudflare Pages</a></h3>

<p>不用买服务器，不用维护 Docker。Vercel 一键部署即开即用；Cloudflare 通过 GitHub Actions 推送即部署，D1 + KV 全自动配置。</p>

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/MoyuFamily/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/MoyuFamily/ai-relay#environment-variables">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" height="42">
  </a>
  &nbsp;&nbsp;
  <a href="#-部署到-cloudflare-pages全自动">
    <img src="https://img.shields.io/badge/⚡_Deploy_to_Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Deploy to Cloudflare" height="42">
  </a>
</p>

<p><strong><a href="https://vercel.com/new/clone?repository-url=https://github.com/MoyuFamily/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/MoyuFamily/ai-relay#environment-variables">👉 立即一键部署</a></strong> · <a href="#-一键部署2-分钟上线你的-ai-api-网关">查看部署步骤</a> · <a href="#-部署到-cloudflare-pages全自动">Cloudflare 部署指南</a></p>

[![Version](https://img.shields.io/badge/Version-2.8.0-green.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Edge Runtime](https://img.shields.io/badge/Edge_Runtime-⚡-black?logo=vercel)](https://vercel.com/docs/functions/edge-functions)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-Redis-black?logo=redis)](https://vercel.com/marketplace/upstash)

[English](README_EN.md) · [中文](README.md)

</div>

---

> 🚀 **不用买服务器，不用写后端，不用维护 Docker。**
>
> AI Relay 基于 Edge Runtime 构建。**Vercel** 一键部署即开即用；**Cloudflare Pages** 通过 GitHub Actions 推送即部署，D1 + KV + Cron 全自动配置。支持 OpenAI / Claude / DeepSeek / 自定义 Provider。

| 你关心的 | AI Relay 的答案 |
|---|---|
| **怎么部署？** | Vercel：点按钮填变量，2 分钟上线 · Cloudflare：Fork + 配 Secrets，push 即部署 |
| **要服务器吗？** | 不需要 VPS，不需要 Docker，不需要后端运维 |
| **能免费跑吗？** | 个人 / 小团队可从免费层开始；Vercel + Upstash（每月 50 万次 KV 操作）或 Cloudflare（D1 + KV 免费层）均可零成本启动 |
| **接入复杂吗？** | OpenAI SDK 只改 `base_url`，继续使用 `/v1/chat/completions` |

## 目录

- [特性](#-特性)
- [一键部署：2 分钟上线你的 AI API 网关](#-一键部署2-分钟上线你的-ai-api-网关)
- [同类项目对比](#-同类项目对比)
- [为什么选择 AI Relay](#为什么选择-ai-relay)
- [使用方法](#-使用方法)
- [配置参考](#-配置参考)
- [架构概览](#-架构概览)
- [Admin 后台](#-admin-后台)
- [通知与告警](#-通知与告警)
- [使用场景](#-使用场景)
- [贡献指南](#-贡献指南)
- [更新日志](#-更新日志)
- [许可证](#-许可证)

## ✨ 特性

| 特性 | 说明 |
|------|------|
| **无服务器架构** | 基于 Edge Runtime（Vercel / Cloudflare），无需购买 VPS / 维护 Docker / 管理后端服务 |
| **一键部署** | Vercel 一键部署即开即用；Cloudflare 通过 GitHub Actions 推送即部署，D1 + KV 全自动配置 |
| **免费层可用** | 个人和小团队可从 Vercel 或 Cloudflare 免费层开始跑起来 |
| **OpenAI 兼容** | 直接用 OpenAI SDK 对接，零改动 |
| **多 Provider 路由** | OpenAI · Claude · DeepSeek · MiMo · 自定义 |
| **多 Key 轮换** | Round-Robin + 429 自动退避 |
| **多级 Fallback** | Provider → Key 链式故障转移 |
| **熔断器** | Provider 故障时自动切换 |
| **Admin 后台** | 密钥管理、配额配置、用量统计、模型测试 |
| **Provider 引导** | Stepper 三步式创建：选模板 → 配密钥 → 测试保存 |
| **模型别名管理** | CSV 批量导入导出、内联编辑、模型可见性隐藏 |
| **优先级规则** | 拖拽排序、条件组合、冲突检测 |
| **用量监控** | 日期筛选、Provider 过滤、趋势图表 |
| **上游模型发现** | 自动从上游 API 拉取可用模型列表 |
| **流式响应** | SSE 透传，实时输出 |
| **Responses API** | 兼容 OpenAI `/v1/responses` 端点，支持流式和非流式 |
| **Webhook 通知** | 企微 / 飞书 / 钉钉 / Slack，日报 + 超限告警 |
| **临时 API Key** | HMAC-SHA256 无状态签名，自动过期 |
| **虚拟模型映射** | 将虚拟模型名路由到真实 Provider |
| **智能路由** | 延迟优先 / 成本优先 / 可用性优先，自动选择最优 Provider |
| **API Key 安全管理** | Key 遮掩展示、健康监控、轮换告警、审计日志 |

## 🚀 一键部署：2 分钟上线你的 AI API 网关

> **前置条件：** [Vercel 账号](https://vercel.com/signup)（免费）+ 至少一个 AI Provider 的 API Key

**第 1 步 — 部署**

点击上方 **Deploy with Vercel** 按钮，填入 3 个环境变量：

| 变量 | 说明 |
|------|------|
| `RELAY_API_KEY` | 客户端请求鉴权密钥（自定义强密码） |
| `RELAY_ADMIN_KEY` | 后台管理登录密钥（可同上） |
| `RELAY_SIGNING_SECRET` | 临时 Key 签名密钥（可同上） |

点击 **Deploy**，等待部署完成。

**第 2 步 — 启用 Upstash for Redis 并关联项目**

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)，进入刚部署的项目。
2. 在左侧菜单选择 **Storage**，点击 **Create Database**。
3. 选择 **Upstash for Redis**，创建数据库时选择 **Free** 套餐，其他选项保持默认即可，然后在弹出窗口中 **Connect to your project**（将 Redis 绑定到当前项目）。
4. 确认 Vercel 已为当前环境自动注入以下变量：
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

> 说明：项目使用 Upstash Redis 的 REST API。Vercel 连接 Upstash 后通常会自动注入 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`；若你手动部署或后续新建 Redis，请在 **Settings → Environment Variables** 中确认这些变量已存在。

**第 3 步 — 验证**

```bash
curl https://你的项目.vercel.app/health
# → {"status":"ok"}
```

**第 4 步 — 添加密钥**

1. 访问 `https://你的项目.vercel.app/admin`，用 `RELAY_ADMIN_KEY` 登录
2. 进入 **Provider Keys**，添加你的 API Key（OpenAI、Claude 等）

**第 5 步 — 开始调用**

```bash
curl -X POST https://你的项目.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5.4", "messages": [{"role": "user", "content": "你好！"}]}'
```

🎉 **完成！** 你已经拥有一个支持多 Provider、自动故障转移的 AI API 中转服务。

<details>
<summary><strong>☁️ 部署到 Cloudflare Pages（全自动）</strong></summary>

**前置条件：** [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）+ GitHub 仓库

> ⚠️ **重要：** 必须先配置 GitHub Secrets，否则部署会失败。

**第 1 步 — Fork 仓库并配置 GitHub Secrets**

在 GitHub 仓库的 **Settings → Secrets and variables → Actions → Repository secrets**（不是 Environment secrets）中添加以下 Secrets：

| Secret | 说明 | 必填 |
|--------|------|------|
| `CLOUDFLARE_API_TOKEN` | CF API Token（需要 Pages:Edit + D1:Edit + KV:Edit 权限） | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | CF 账号 ID（在 CF Dashboard 右侧可找到） | ✅ |
| `RELAY_API_KEY` | 客户端请求鉴权密钥（自定义强密码） | ✅ |
| `RELAY_ADMIN_KEY` | 后台管理登录密钥（可选，默认同 `RELAY_API_KEY`） | ⬜ |
| `RELAY_SIGNING_SECRET` | 临时 Key 签名密钥（可选，默认同 `RELAY_API_KEY`） | ⬜ |
| `CRON_SECRET` | Cron 任务鉴权密钥（可选，自动生成） | ⬜ |

> **如何获取 Cloudflare API Token：**
> 1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
> 2. 点击 **Create Token** → **Create Custom Token**
> 3. 权限设置：
>    - Account → Cloudflare Pages → Edit
>    - Account → D1 → Edit
>    - Account → Workers KV Storage → Edit
> 4. 复制生成的 Token
>
> **如何获取 Account ID：**
> 1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
> 2. 在右侧边栏可以看到 **Account ID**
>
> **⚠️ 注意：** 必须添加到 **Repository secrets**，不是 Environment secrets。Environment secrets 只在特定环境部署时可用，会导致 workflow 无法读取。

**同时，在 Variables 标签页添加以下变量（Cron 定时任务必需）：**

在 **Settings → Secrets and variables → Actions → Variables** 中添加：

| Variable | 说明 | 必填 |
|----------|------|------|
| `DEPLOY_URL` | 部署完成后的访问地址，例如 `https://ai-relay.pages.dev`（Cron 任务通过此地址发起健康探测和用量聚合请求） | ✅ |

> **说明：** `DEPLOY_URL` 是 Repository Variable（不是 Secret），需要在 Variables 标签页单独添加。未配置时 Cron 任务会因 URL 为空而失败（curl exit code 3）。

**第 2 步 — 推送触发部署**

推送到 `main` 分支，GitHub Actions 会自动完成所有配置：

✅ 验证 GitHub Secrets 已配置  
✅ 自动检测并创建 D1 数据库（`ai-relay`）  
✅ 自动检测并创建 KV namespace（`ai-relay`）  
✅ 自动执行 D1 migrations（建表）  
✅ 自动构建并部署到 Cloudflare Pages  
✅ 自动配置环境变量  
✅ 自动绑定 KV/D1 资源  

**第 3 步 — 验证部署**

```bash
curl https://ai-relay.pages.dev/health
# → {"status":"ok"}
```

访问 `https://ai-relay.pages.dev/admin` 开始使用！

> **存储说明：** CF 部署使用 Cloudflare KV（配置数据）+ D1（用量统计）。免费层限制：D1 写入 10 万行/天（约支持 3–5 万次 AI 请求/天），KV 写入 1,000 次/天（仅用于配置变更，正常使用不会触及上限）。开启 quota 检查时每次请求写一行 D1，高并发场景请关注用量。
> 
> **Cron 说明：** CF Pages Cron Triggers 通过 `worker.ts` 中的 `scheduled()` handler 执行定时任务，不走 HTTP 路由。默认配置每日 00:00 UTC 重置配额计数器，00:05 UTC 执行健康探测。

</details>

<details>
<summary><strong>📦 本地开发</strong></summary>

```bash
git clone https://github.com/MoyuFamily/ai-relay.git
cd ai-relay
npm install
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 API Keys
npm run dev  # http://localhost:3000
```

</details>

## 🏁 同类项目对比

| 特性 | AI Relay | OpenRouter | OneAPI / new-api | FastGPT |
|------|----------|------------|------------------|---------|
| **部署方式** | **Vercel / Cloudflare 一键部署（Edge）** | 纯 SaaS | 自托管（Docker） | 自托管（Docker） |
| **基础设施成本** | **无需服务器，可从免费层开始** | 按量付费 | 需要服务器 | 需要服务器 |
| **冷启动** | < 50ms | N/A | 秒级 | 秒级 |
| **熔断器** | ✅ | ❌ | ❌ | ❌ |
| **Fallback 链** | ✅ 可配置 | ✅ 自动 | ✅ 基础 | ✅ 基础 |
| **并发控制** | ✅ 令牌桶 + 队列 | 限流 | ❌ | ❌ |
| **Webhook 告警** | ✅ 4 平台 | ❌ | ❌ | ✅ |
| **临时 API Key** | ✅ HMAC 签名 | ❌ | ✅ | ✅ |
| **主要场景** | 个人 / 小团队 | API 市场 | 多 Key 管理 | 知识库 + API |

**选择 AI Relay：** 当你想要"自己可控的 AI API 网关"，但不想买服务器、维护 Docker 或搭后端时，AI Relay 是更轻的路线：无服务器、双平台（Vercel / Cloudflare）、2 分钟部署、多 Provider 故障转移、Edge 低延迟。

## 为什么选择 AI Relay？

- **不用服务器**：跑在 Edge Runtime，无需 VPS、Docker、运维。
- **双平台可选**：Vercel 一键部署；Cloudflare 通过 GitHub Actions 推送即部署，不绑定单一平台。
- **部署足够快**：点击按钮 + 填环境变量，2 分钟完成上线。
- **成本足够低**：个人开发者和小团队可以从免费层开始。
- **接入足够简单**：兼容 OpenAI API，现有 SDK 只需改 `base_url`。
- **容灾足够实用**：多 Provider、多 Key、Fallback、熔断器内置。

## 📖 使用方法

### OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://你的项目.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "你好！"}]
)
```

### 流式响应

```python
stream = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "讲个故事"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

### Responses API

```bash
# 非流式
curl -X POST https://你的项目.vercel.app/v1/responses \
  -H "Authorization: Bearer YOUR_R...KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5.4", "input": "你好！"}'

# 流式
curl -X POST https://你的项目.vercel.app/v1/responses \
  -H "Authorization: Bearer YOUR_R...KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5.4", "input": "你好！", "stream": true}'
```

> **注意：** Responses API 目前仅支持 OpenAI 格式的 Provider，Anthropic 格式的 Provider 会返回 400 错误。

### Claude / Anthropic Messages API

Claude 客户端可以直接把 `base_url` 指向 Relay 的 `/v1`，使用原生 Anthropic Messages 协议：

```bash
curl -X POST https://你的项目.vercel.app/v1/messages \
  -H "x-api-key: YOUR_RELAY_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "你好！"}]
  }'
```

`/v1/messages` 只路由到 `headerFormat: anthropic` 的供应商；上游 Key 仍使用 `CLAUDE_KEYS` 或 Admin 后台配置的 Claude 供应商密钥。OpenAI 兼容客户端也可以继续通过 `/v1/chat/completions` 调用 Claude 模型，Relay 会转换为 Anthropic 上游请求。

### 临时密钥

在 Admin 后台生成指定有效期的临时密钥：
- **格式：** `***${base64Payload}.${signature}`
- **校验：** Vercel Edge 服务端 HMAC-SHA256 无状态签名校验
- **场景：** CI/CD 流水线、临时授权、API 分享

## 🔧 配置参考

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `RELAY_API_KEY` | 客户端请求鉴权密钥（逗号分隔支持多个） | ✅ |
| `RELAY_ADMIN_KEY` | 后台管理登录密钥（未设置则回退到 `RELAY_API_KEY`） | ⬜ |
| `RELAY_SIGNING_SECRET` | 临时 Key 签名密钥（未设置则回退到管理/请求密钥） | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys（逗号分隔） | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |
| `XIAOMIMIMO_SGP_CODING_KEYS` | MiMo SGP Coding Plan API Keys | ⬜ |
| `XIAOMI_CODING_KEYS` | MiMo Coding Plan API Keys | ⬜ |
| `RELAY_KV_USAGE_SAMPLE_RATE` | 用量统计写入采样率，`1` 为精确统计，`0.1` 表示约 10% 写入并按比例估算 | ⬜ |

> [!NOTE]
> Provider 密钥建议通过 Admin 后台配置（存储在 Upstash Redis 中），而非写入环境变量。后台添加/测试密钥时支持粘贴原始 API Key 或 Base64 编码后的 Key，系统会在保存和测试前自动解码。

### 支持的 Provider

| Provider | 模型示例 | 状态 |
|----------|---------|------|
| OpenAI | gpt-5.4, gpt-latest, gpt-5.4-mini | ✅ 内置 |
| Anthropic (Claude) | claude-sonnet-4-6, claude-opus-4-7 | ✅ 内置 |
| DeepSeek | deepseek-v4-flash, deepseek-v4-pro | ✅ 内置 |
| MiMo (API Key) | mimo-v2.5, mimo-v2.5-pro | ✅ 内置 |
| MiMo SGP (Coding Plan) | mimo-v2.5-sgp, mimo-v2.5-pro-sgp | ✅ 内置 |
| MiMo (Coding Plan) | mimo-v2.5-coding, mimo-v2.5-pro-coding | ✅ 内置 |
| 自定义 | 任意 OpenAI 兼容 API | ✅ 可配置 |

## 🏗️ 架构概览

```
Vercel 部署:
Client → Edge Runtime (全球分发, <50ms 延迟)
              ├─ 熔断器
              ├─ 多级 Fallback (Provider → Key)
              ├─ Key 轮换 (Round-Robin + 429 退避)
              └─ Upstash Redis (密钥, 配额, 用量)

Cloudflare 部署:
Client → CF Pages Worker (全球分发, <50ms 延迟)
              ├─ 熔断器
              ├─ 多级 Fallback (Provider → Key)
              ├─ Key 轮换 (Round-Robin + 429 退避)
              ├─ Cloudflare KV (密钥, 配额)
              ├─ Cloudflare D1 (用量统计)
              └─ CF Cron Triggers (定时任务)
```

## 📊 Admin 后台

访问 `/admin` 使用 `RELAY_ADMIN_KEY` 登录：

| 功能 | 说明 |
|------|------|
| **Provider Keys** | 管理所有 Provider 的 API 密钥，支持连通性测试 |
| **Provider 引导** | Stepper 三步式创建 Provider，支持 8 个预置模板 |
| **模型别名** | CSV 批量导入导出、内联编辑、模型可见性隐藏 |
| **优先级规则** | 拖拽排序的路由规则编辑器，支持冲突检测 |
| **用量监控** | 日期筛选、Provider 维度过滤、用量趋势图表 |
| **配额配置** | 为每个 Provider 设置动态配额，KV 持久化 |
| **模型测试** | 测试特定模型的连通性和响应 |
| **临时密钥** | 生成有时效的 HMAC-SHA256 签名 API 密钥 |
| **自定义 Provider** | 添加 / 编辑 / 删除自定义 Provider |
| **用量统计** | 请求次数 + Token 用量趋势图 |
| **Key Pool 状态** | 实时同步所有密钥状态 |
| **请求日志** | 轻量排障缓存：服务端当前实例内存 + 浏览器本地副本，不写入 KV |
| **通知设置** | Webhook 推送、告警阈值、日报时间 |

> 💡 **移动端友好** — 响应式设计，手机上也能随时管理中转策略。

## 📸 截图

<details>
<summary>点击展开截图</summary>

**运行概览**

![管理后台运行概览](docs/assets/screenshots/admin-overview.png)

限额状态、今日消耗概览、Token 消耗趋势一目了然。

**密钥管理**

![管理后台密钥管理](docs/assets/screenshots/admin-keys.png)

多服务商密钥池，带状态指示和模型前缀映射。

**辅助工具**

![管理后台辅助工具](docs/assets/screenshots/admin-tools.png)

临时密钥生成和模型连通性测试。

</details>

## 📢 通知与告警

支持通过 Webhook 推送每日用量报告和超限告警。

| 平台 | 格式 |
|------|------|
| 企业微信 | Markdown |
| 飞书 | 消息卡片 |
| 钉钉 | Markdown |
| Slack | Block Kit |
| 通用 Webhook | 自定义 JSON |

**配置：** Admin 后台 → 通知设置 → 添加 Webhook → 填入 URL → 启用

**每日报告：** Vercel Cron 定时发送，包含当日总量、Provider 分项、前日对比。

**超限告警：** 支持按 Provider 或全局设置请求量 / Token 量阈值。

## 🎯 使用场景

| 场景 | 说明 |
|------|------|
| **个人开发者** | 多 Key 整合为单一端点，自动轮换 + 故障转移 |
| **小团队** | 共享中转实例，配额管理，Admin 可见性 |
| **CI/CD** | HMAC 临时密钥，自动过期无需清理 |
| **多地域应用** | Edge 全球 < 50ms，熔断防级联故障 |
| **成本优化** | 虚拟模型映射，按任务复杂度路由 Provider |
| **企业内部** | API 网关 + Webhook 告警，用量监控 |



## 👥 团队

| | 姓名 | 角色 | 贡献 | 联系 |
|---|---|---|---|---|
| <img src="https://avatars.githubusercontent.com/u/7930911?v=4" width="32" height="32" style="border-radius:50%"> | Parsifal | 创始人 & 项目负责人 | 项目发起人，负责整体架构设计、技术选型和团队管理 | zmw@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286714101?v=4" width="32" height="32" style="border-radius:50%"> | 小赫 | 协调者 | 团队任务协调、需求分析、进度跟踪和质量把控 | xiaohe@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286719582?v=4" width="32" height="32" style="border-radius:50%"> | 像素姐 | 设计总监 | 品牌视觉体系设计、Logo 设计、UI/UX 设计和 README 视觉收尾 | pixiel@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286715358?v=4" width="32" height="32" style="border-radius:50%"> | 码飞 | 技术总监 | 全栈架构开发、CI/CD 流水线建设、系统性能优化和技术选型评估 | mafei@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286716759?v=4" width="32" height="32" style="border-radius:50%"> | 饼哥 | 产品总监 | 产品规划、需求分析、用户体验设计和迭代策略 | bingge@izmw.me |

## 🤝 贡献指南

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 🙏 致谢

- [OpenRouter](https://openrouter.ai) — 多 Provider API 聚合模式先驱
- [OneAPI](https://github.com/songquanpeng/one-api) / [new-api](https://github.com/Calcium-Ion/new-api) — 最流行的开源 API 管理系统
- [FastGPT](https://github.com/labring/FastGPT) — API 中转与知识库工作流整合
- [Vercel](https://vercel.com) — Edge Runtime + KV 存储
- [OpenAI](https://platform.openai.com) — OpenAI 兼容 API 标准
- [Linux Do](https://linux.do/) — 温暖的开发者社区，AI Relay 的灵感来源

## 📝 更新日志

项目版本变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## 📄 许可证

本项目基于 MIT 许可证 — 详见 [LICENSE](LICENSE) 文件。
