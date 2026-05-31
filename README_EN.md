<div align="center">

<img src="docs/assets/logo-banner.svg" alt="AI Relay" width="400">

**Serverless AI API Relay Gateway — one-click deploy to Vercel, or automated deploy to Cloudflare via GitHub Actions**

<h3>🚀 <a href="https://vercel.com/new/clone?repository-url=https://github.com/MoyuFamily/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/MoyuFamily/ai-relay#environment-variables">Deploy to Vercel in one click and launch your AI API gateway in 2 minutes</a></h3>

<p>No server, no Docker, no backend ops. Vercel one-click deploy; Cloudflare via GitHub Actions push-to-deploy.</p>

<p>
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/MoyuFamily/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/MoyuFamily/ai-relay#environment-variables">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" height="42">
  </a>
</p>

<p><strong><a href="https://vercel.com/new/clone?repository-url=https://github.com/MoyuFamily/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/MoyuFamily/ai-relay#environment-variables">👉 Deploy Now</a></strong> · <a href="#-one-click-deploy-launch-your-ai-api-gateway-in-2-minutes">View setup steps</a></p>

[![Version](https://img.shields.io/badge/Version-2.8.0-green.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Edge Runtime](https://img.shields.io/badge/Edge_Runtime-⚡-black?logo=vercel)](https://vercel.com/docs/functions/edge-functions)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-Redis-black?logo=redis)](https://vercel.com/marketplace/upstash)

[English](README_EN.md) · [中文](README.md)

</div>

---

> 🚀 **No server, no Docker, no backend ops.** Vercel one-click; Cloudflare push-to-deploy via GitHub Actions.
>
> Click **Deploy with Vercel** for instant launch, or fork and push to deploy on Cloudflare with D1 + KV auto-configuration.

| What you care about | AI Relay's answer |
|---|---|
| **How do I deploy it?** | Vercel: one-click deploy; Cloudflare: fork → configure GitHub Secrets → push to main, GitHub Actions handles the rest |
| **Do I need a server?** | No VPS, no Docker, no backend operations |
| **Can it start free?** | Vercel + Upstash free tier (500K KV ops/month); Cloudflare free tier (D1 5M reads + KV 100K ops/day); with sampling enabled, request-to-KV ratio drops to ~1:1 |
| **Is integration hard?** | Keep the OpenAI SDK, change only `base_url`, and keep using `/v1/chat/completions` |

## Table of Contents

- [Features](#-features)
- [One-Click Deploy: Launch Your AI API Gateway in 2 Minutes](#-one-click-deploy-launch-your-ai-api-gateway-in-2-minutes)
- [Comparison](#-comparison-with-similar-projects)
- [Why AI Relay?](#why-ai-relay)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Architecture](#-architecture)
- [Admin Dashboard](#-admin-dashboard)
- [Notifications & Alerts](#-notifications--alerts)
- [Use Cases](#-use-cases)
- [Contributing](#-contributing)
- [Changelog](#-changelog)
- [License](#-license)

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Serverless Architecture** | Vercel Edge Runtime or Cloudflare Pages Workers — no VPS, no Docker, no backend ops |
| **One-Click Deploy** | Vercel: one-click Deploy button; Cloudflare: fork + configure Secrets + push to main, GitHub Actions auto-deploys |
| **Free Tier Friendly** | Vercel + Upstash free tier; Cloudflare free tier (D1 5M reads + KV 100K ops/day) |
| **OpenAI Compatible** | Drop-in replacement for the OpenAI SDK |
| **Multi-Provider Routing** | OpenAI · Claude · DeepSeek · MiMo · Custom |
| **Multi-Key Rotation** | Round-Robin with automatic 429 backoff |
| **Multi-Level Fallback** | Provider → Key chain failover |
| **Circuit Breaker** | Automatic failover when provider is down |
| **Admin Dashboard** | Key management, quota config, usage stats, model testing |
| **Provider Wizard** | Stepper-based creation: select template → configure key → test & save |
| **Model Aliases** | CSV import/export, inline edit, model visibility toggle |
| **Priority Rules** | Drag-to-reorder routing rules with conflict detection |
| **Usage Monitor** | Date range, provider filter, usage trend charts |
| **Upstream Discovery** | Auto-fetch available models from upstream APIs |
| **Streaming Responses** | SSE pass-through for real-time output |
| **Responses API** | OpenAI `/v1/responses` endpoint compatible, streaming and non-streaming |
| **Webhook Notifications** | WeCom / Feishu / DingTalk / Slack — daily reports + alerts |
| **Temp API Keys** | HMAC-SHA256 stateless signing, auto-expiring |
| **Virtual Model Mapping** | Route virtual model names to real providers |
| **Smart Routing** | Latency / cost / availability priority, auto-select optimal provider |
| **API Key Security** | Masked display, health monitoring, rotation alerts, audit logs |

## 🚀 One-Click Deploy: Launch Your AI API Gateway in 2 Minutes

> **Prerequisites:** [Vercel account](https://vercel.com/signup) (free) + at least one AI provider API key

**Step 1 — Deploy**

Click the **Deploy with Vercel** button above, fill in 3 environment variables:

| Variable | Description |
|----------|-------------|
| `RELAY_API_KEY` | Client request auth key (choose any strong secret) |
| `RELAY_ADMIN_KEY` | Admin dashboard login key (can be the same) |
| `RELAY_SIGNING_SECRET` | Secret for signing temporary keys (can be the same) |

Click **Deploy** and wait for it to finish.

**Step 2 — Enable Upstash for Redis and Connect to Your Project**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and open the project you just deployed.
2. In the left sidebar, choose **Storage**, then click **Create Database**.
3. Select **Upstash for Redis**. When creating the database, choose the **Free** plan and keep the other options at their defaults, then **Connect to your project** in the popup.
4. Verify Vercel has injected the following environment variables automatically:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

> Note: The project uses the Upstash Redis REST API. After Vercel connects Upstash to your project, it usually injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. If you deployed manually or created Redis later, check **Settings → Environment Variables** to confirm these variables exist.

**Step 3 — Verify**

```bash
curl https://your-project.vercel.app/health
# → {"status":"ok"}
```

**Step 4 — Add Keys**

1. Visit `https://your-project.vercel.app/admin`, log in with `RELAY_ADMIN_KEY`
2. Go to **Provider Keys**, add your API keys (OpenAI, Claude, etc.)

**Step 5 — Start Using**

```bash
curl -X POST https://your-project.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5.4", "messages": [{"role": "user", "content": "Hello!"}]}'
```

🎉 **Done!** You now have a multi-provider AI API relay with automatic failover.

<details>
<summary><strong>☁️ Deploy to Cloudflare Pages (fully automated)</strong></summary>

**Prerequisites:** [Cloudflare account](https://dash.cloudflare.com/sign-up) (free) + GitHub repository

> ⚠️ **Important:** GitHub Secrets must be configured before pushing, or the deployment will fail.

**Step 1 — Fork the repo and configure GitHub Secrets**

In your GitHub repository, go to **Settings → Secrets and variables → Actions → Repository secrets** (not Environment secrets) and add:

| Secret | Description | Required |
|--------|-------------|----------|
| `CLOUDFLARE_API_TOKEN` | CF API Token (needs Pages:Edit + D1:Edit + KV:Edit permissions) | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | CF Account ID (found in the CF Dashboard sidebar) | ✅ |
| `RELAY_API_KEY` | Client request auth key (choose any strong secret) | ✅ |
| `RELAY_ADMIN_KEY` | Admin login key (optional, defaults to `RELAY_API_KEY`) | ⬜ |
| `RELAY_SIGNING_SECRET` | Temp key signing secret (optional, defaults to `RELAY_API_KEY`) | ⬜ |
| `CRON_SECRET` | Cron job auth key (optional, auto-generated if omitted) | ⬜ |

> **How to get a Cloudflare API Token:**
> 1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
> 2. Click **Create Token** → **Create Custom Token**
> 3. Set permissions: Account → Cloudflare Pages → Edit, Account → D1 → Edit, Account → Workers KV Storage → Edit
> 4. Copy the generated token
>
> **How to get your Account ID:**
> 1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
> 2. Your **Account ID** is shown in the right sidebar
>
> **⚠️ Note:** Add these to **Repository secrets**, not Environment secrets. Environment secrets are only available in specific deployment environments and will cause the workflow to fail.

**Also add the following in the Variables tab (required for Cron jobs):**

In **Settings → Secrets and variables → Actions → Variables**, add:

| Variable | Description | Required |
|----------|-------------|----------|
| `DEPLOY_URL` | Your deployed app URL, e.g. `https://ai-relay.pages.dev` (used by Cron jobs to call health probe and usage aggregation endpoints) | ✅ |

> **Note:** `DEPLOY_URL` is a Repository Variable (not a Secret) and must be added in the Variables tab. Without it, Cron jobs will fail with `curl exit code 3` because the URL resolves to an empty string.

**Step 2 — Push to trigger deployment**

Push to the `main` branch — GitHub Actions will automatically:

✅ Validate that required GitHub Secrets are configured  
✅ Auto-detect and create the D1 database (`ai-relay`)  
✅ Auto-detect and create the KV namespace (`ai-relay`)  
✅ Run D1 migrations (create tables)  
✅ Build and deploy to Cloudflare Pages  
✅ Configure environment variables  
✅ Bind KV/D1 resources  

**Step 3 — Verify deployment**

```bash
curl https://ai-relay.pages.dev/health
# → {"status":"ok"}
```

Visit `https://ai-relay.pages.dev/admin` to start using it.

> **Storage:** CF deployment uses Cloudflare KV (config data) + D1 (usage stats). Free tier limits: D1 writes 100K rows/day (~30–50K AI requests/day), KV writes 1,000/day (config changes only — normal usage won't hit this).
>
> **Cron:** CF Pages Cron Triggers run via the `scheduled()` handler in `worker.ts`, not HTTP routes. Default schedule: daily quota reset at 00:00 UTC, health probe at 00:05 UTC.

</details>

<details>
<summary><strong>📦 Local Development</strong></summary>

```bash
git clone https://github.com/MoyuFamily/ai-relay.git
cd ai-relay
npm install
cp .env.local.example .env.local
# Edit .env.local and fill in your API keys
npm run dev  # http://localhost:3000
```

</details>

## 🏁 Comparison with Similar Projects

| Feature | AI Relay | OpenRouter | OneAPI / new-api | FastGPT |
|---------|----------|------------|------------------|---------|
| **Deployment** | **Vercel one-click deploy (Edge)** | SaaS only | Self-hosted (Docker) | Self-hosted (Docker) |
| **Infra Cost** | **No server required; free-tier friendly** | Pay-per-use | Requires server | Requires server |
| **Cold Start** | < 50ms | N/A | Seconds | Seconds |
| **Circuit Breaker** | ✅ | ❌ | ❌ | ❌ |
| **Fallback Chains** | ✅ Configurable | ✅ Auto | ✅ Basic | ✅ Basic |
| **Concurrency** | ✅ Token bucket + queue | Rate-limited | ❌ | ❌ |
| **Webhook Alerts** | ✅ 4 platforms | ❌ | ❌ | ✅ |
| **Temp API Keys** | ✅ HMAC signed | ❌ | ✅ | ✅ |
| **Primary Use Case** | Personal / small team | API marketplace | Multi-key mgmt | Knowledge base + API |

**Choose AI Relay:** when you want a self-controlled AI API gateway without buying servers, maintaining Docker, or operating backend services. AI Relay gives you serverless deployment, a 2-minute setup path, multi-provider failover, and low-latency Edge runtime.

## Why AI Relay?

- **No server required**: Runs on Vercel Edge Runtime — no VPS, Docker, or ops work.
- **Fast to deploy**: Click a button, set environment variables, and launch in about 2 minutes.
- **Low starting cost**: Individual developers and small teams can start on Vercel's free tier.
- **Easy integration**: OpenAI-compatible API; existing SDKs only need a `base_url` change.
- **Practical resilience**: Multi-provider routing, key rotation, fallback, and circuit breaker built in.

## 📖 Usage

### OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://your-project.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Streaming

```python
stream = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

### Responses API

```bash
# Non-streaming
curl -X POST https://your-project.vercel.app/v1/responses \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5.4", "input": "Hello!"}'

# Streaming
curl -X POST https://your-project.vercel.app/v1/responses \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5.4", "input": "Hello!", "stream": true}'
```

> **Note:** The Responses API currently only supports OpenAI-format providers. Anthropic-format providers will return a 400 error.

### Temporary Keys

Generate time-limited keys from the Admin dashboard:
- **Format:** `***${base64Payload}.${signature}`
- **Validation:** Stateless HMAC-SHA256 verification on Vercel Edge
- **Use cases:** CI/CD pipelines, temporary access, API sharing

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RELAY_API_KEY` | Client request auth key (comma-separated) | ✅ |
| `RELAY_ADMIN_KEY` | Admin login key (falls back to `RELAY_API_KEY`) | ⬜ |
| `RELAY_SIGNING_SECRET` | Temp key signing secret (falls back to admin/api key) | ⬜ |
| `OPENAI_KEYS` | OpenAI API Keys (comma-separated) | ⬜ |
| `CLAUDE_KEYS` | Anthropic API Keys | ⬜ |
| `DEEPSEEK_KEYS` | DeepSeek API Keys | ⬜ |
| `XIAOMI_KEYS` | Xiaomi API Keys | ⬜ |
| `XIAOMIMIMO_SGP_CODING_KEYS` | MiMo SGP Coding Plan API keys | ⬜ |
| `XIAOMI_CODING_KEYS` | MiMo Coding Plan API keys | ⬜ |
| `RELAY_KV_USAGE_SAMPLE_RATE` | Usage write sample rate; `1` is exact, `0.1` writes about 10% and scales values as estimates | ⬜ |

> [!NOTE]
> Provider keys are best configured via the Admin panel (stored in Upstash Redis), not as environment variables. When adding or testing keys in Admin, both raw API keys and Base64-encoded keys are accepted and decoded automatically before saving or testing.

### Supported Providers

| Provider | Example Models | Status |
|----------|---------------|--------|
| OpenAI | gpt-5.4, gpt-latest, gpt-5.4-mini | ✅ Built-in |
| Anthropic (Claude) | claude-sonnet-4-6, claude-opus-4-7 | ✅ Built-in |
| DeepSeek | deepseek-v4-flash, deepseek-v4-pro | ✅ Built-in |
| MiMo (API Key) | mimo-v2.5, mimo-v2.5-pro | ✅ Built-in |
| MiMo SGP (Coding Plan) | mimo-v2.5-sgp, mimo-v2.5-pro-sgp | ✅ Built-in |
| MiMo (Coding Plan) | mimo-v2.5-coding, mimo-v2.5-pro-coding | ✅ Built-in |
| Custom | Any OpenAI-compatible API | ✅ Configurable |

## 🏗️ Architecture

```
Client → Edge Runtime (global, <50ms latency)
              ├─ Circuit Breaker
              ├─ Multi-Level Fallback (Provider → Key)
              ├─ Key Rotation (Round-Robin + 429 backoff)
              └─ Upstash Redis (keys, quotas, usage)
```

## 📊 Admin Dashboard

Access at `/admin` with your `RELAY_ADMIN_KEY`:

| Feature | Description |
|---------|-------------|
| **Provider Keys** | Manage API keys with connectivity testing |
| **Provider Wizard** | Stepper-based creation with 8 preset templates |
| **Model Aliases** | CSV import/export, inline edit, visibility toggle |
| **Priority Rules** | Drag-to-reorder routing editor with conflict detection |
| **Usage Monitor** | Date range, provider filter, trend charts |
| **Quota Config** | Dynamic per-provider quotas, KV-persisted |
| **Model Testing** | Test connectivity and response for specific models |
| **Temporary Keys** | Generate HMAC-SHA256 signed time-limited keys |
| **Custom Providers** | Add / edit / delete custom providers |
| **Usage Stats** | Request counts + token usage trends |
| **Key Pool Status** | Real-time sync of all key states |
| **Request Logs** | Lightweight diagnostics cache: current server instance memory + this browser's local copy, not written to KV |
| **Notification Settings** | Webhook config, alert thresholds, report schedule |

> 💡 **Mobile Friendly** — Responsive design, manage relay strategies on the go.

## 📸 Screenshots

<details>
<summary>Click to expand</summary>

**Overview**

![Admin Dashboard Overview](docs/assets/screenshots/admin-overview.png)

Quota status, daily usage stats, and token consumption trends at a glance.

**Key Management**

![Admin Dashboard Key Management](docs/assets/screenshots/admin-keys.png)

Multi-provider key pool with status indicators and model prefix mapping.

**Tools**

![Admin Dashboard Tools](docs/assets/screenshots/admin-tools.png)

Temporary key generation and model connectivity testing.

</details>

## 📢 Notifications & Alerts

Push daily usage reports and quota alerts via Webhooks.

| Platform | Format |
|----------|--------|
| WeCom | Markdown |
| Feishu | Message card |
| DingTalk | Markdown |
| Slack | Block Kit |
| Generic Webhook | Custom JSON |

**Setup:** Admin dashboard → Notification Settings → Add Webhook → Enter URL → Enable

**Daily Reports:** Sent via Vercel Cron with daily totals, per-provider breakdown, and day-over-day comparison.

**Quota Alerts:** Per-provider or global thresholds for requests / tokens.

## 🎯 Use Cases

| Scenario | Description |
|----------|-------------|
| **Individual Developers** | Consolidate multiple keys into one endpoint with auto-rotation and failover |
| **Small Teams** | Shared relay instance with quota management and admin visibility |
| **CI/CD Pipelines** | HMAC temp keys that auto-expire, no cleanup needed |
| **Multi-Region Apps** | Edge < 50ms globally, circuit breaker prevents cascading failures |
| **Cost Optimization** | Virtual model mapping routes tasks to cheaper providers |
| **Enterprise Internal** | API gateway + webhook alerts for usage monitoring |



## 👥 Team

| | Name | Role | Contribution | Contact |
|---|---|---|---|---|
| <img src="https://avatars.githubusercontent.com/u/35733668?v=4" width="32" height="32" style="border-radius:50%"> | Parsifal | Founder & Project Lead | Project initiator, responsible for overall architecture design, technology selection, and team management | zmw@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286714101?v=4" width="32" height="32" style="border-radius:50%"> | 小赫 (Xiaohe) | Coordinator | Team task coordination, requirements analysis, progress tracking, and quality assurance | xiaohe@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286719582?v=4" width="32" height="32" style="border-radius:50%"> | 像素姐 (Pixel) | Design Director | Brand visual system design, Logo design, UI/UX design, and README visual polish | pixiel@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286715358?v=4" width="32" height="32" style="border-radius:50%"> | 码飞 (Mafei) | Tech Director | Full-stack architecture development, CI/CD pipeline construction, system performance optimization, and tech stack evaluation | mafei@izmw.me |
| <img src="https://avatars.githubusercontent.com/u/286716759?v=4" width="32" height="32" style="border-radius:50%"> | 饼哥 (Bingge) | Product Director | Product planning, requirements analysis, user experience design, and iteration strategy | bingge@izmw.me |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai) — Pioneered multi-provider API aggregation
- [OneAPI](https://github.com/songquanpeng/one-api) / [new-api](https://github.com/Calcium-Ion/new-api) — The go-to open-source API management system
- [FastGPT](https://github.com/labring/FastGPT) — API relay + knowledge base workflow integration
- [Vercel](https://vercel.com) — Edge Runtime + KV storage
- [OpenAI](https://platform.openai.com) — The OpenAI-compatible API standard
- [Linux Do](https://linux.do/) — A warm developer community, the inspiration behind AI Relay

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
