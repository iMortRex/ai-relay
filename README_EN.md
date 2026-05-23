<div align="center">

<img src="docs/assets/logo-banner.svg" alt="AI Relay" width="400">

**A lightweight, open-source AI API relay service built on Vercel Edge Runtime**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ParsifalC/ai-relay&env=RELAY_API_KEY,RELAY_ADMIN_KEY,RELAY_SIGNING_SECRET&envDescription=API%20authentication%20keys%20(required%20for%20security)&envLink=https://github.com/ParsifalC/ai-relay#environment-variables)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Edge Runtime](https://img.shields.io/badge/Edge_Runtime-⚡-black?logo=vercel)](https://vercel.com/docs/functions/edge-functions)
[![Vercel KV](https://img.shields.io/badge/Vercel_KV-Redis-black?logo=redis)](https://vercel.com/docs/storage/vercel-kv)

[English](README_EN.md) · [中文](README.md)

</div>

---

## Table of Contents

- [Features](#-features)
- [5-Minute Quick Start](#-5-minute-quick-start)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Architecture](#-architecture)
- [Admin Dashboard](#-admin-dashboard)
- [Notifications & Alerts](#-notifications--alerts)
- [Comparison](#-comparison-with-similar-projects)
- [Use Cases](#-use-cases)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Multi-Key Rotation** | Round-Robin with automatic 429 backoff |
| **Multi-Provider Routing** | OpenAI · Claude · DeepSeek · MiMo · Custom |
| **Multi-Level Fallback** | Provider → Key chain failover |
| **Circuit Breaker** | Automatic failover when provider is down |
| **Admin Dashboard** | Key management, quota config, usage stats, model testing |
| **Streaming Responses** | SSE pass-through for real-time output |
| **Webhook Notifications** | WeCom / Feishu / DingTalk / Slack — daily reports + alerts |
| **Temp API Keys** | HMAC-SHA256 stateless signing, auto-expiring |
| **Virtual Model Mapping** | Route virtual model names to real providers |
| **OpenAI Compatible** | Drop-in replacement for the OpenAI SDK |
| **One-Click Deploy** | Deploy to Vercel in 2 minutes, free tier works |

## 🚀 5-Minute Quick Start

> **Prerequisites:** [Vercel account](https://vercel.com/signup) (free) + at least one AI provider API key

**Step 1 — Deploy**

Click the **Deploy with Vercel** button above, fill in 3 environment variables:

| Variable | Description |
|----------|-------------|
| `RELAY_API_KEY` | Client request auth key (choose any strong secret) |
| `RELAY_ADMIN_KEY` | Admin dashboard login key (can be the same) |
| `RELAY_SIGNING_SECRET` | Secret for signing temporary keys (can be the same) |

Click **Deploy** and wait for it to finish.

**Step 2 — Verify**

```bash
curl https://your-project.vercel.app/health
# → {"status":"ok"}
```

**Step 3 — Add Keys**

1. Visit `https://your-project.vercel.app/admin`, log in with `RELAY_ADMIN_KEY`
2. Go to **Provider Keys**, add your API keys (OpenAI, Claude, etc.)

**Step 4 — Start Making Requests**

```bash
curl -X POST https://your-project.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_RELAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello!"}]}'
```

🎉 **Done!** You now have a multi-provider AI API relay with automatic failover.

<details>
<summary><strong>📦 Local Development</strong></summary>

```bash
git clone https://github.com/ParsifalC/ai-relay.git
cd ai-relay
npm install
cp .env.local.example .env.local
# Edit .env.local and fill in your API keys
npm run dev  # http://localhost:3000
```

</details>

## 📖 Usage

### OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://your-project.vercel.app/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### Streaming

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

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

> [!NOTE]
> Provider keys are best configured via the Admin panel (stored in Vercel KV), not as environment variables.

### Supported Providers

| Provider | Example Models | Status |
|----------|---------------|--------|
| OpenAI | gpt-4o, gpt-4, gpt-3.5-turbo | ✅ Built-in |
| Anthropic (Claude) | claude-3.5-sonnet, claude-3-opus | ✅ Built-in |
| DeepSeek | deepseek-chat, deepseek-coder | ✅ Built-in |
| Xiaomi (MiMo) | mimo-7b | ✅ Built-in |
| Custom | Any OpenAI-compatible API | ✅ Configurable |

## 🏗️ Architecture

```
Client → Edge Runtime (global, <50ms latency)
              ├─ Circuit Breaker
              ├─ Multi-Level Fallback (Provider → Key)
              ├─ Key Rotation (Round-Robin + 429 backoff)
              └─ Vercel KV (keys, quotas, usage)
```

## 📊 Admin Dashboard

Access at `/admin` with your `RELAY_ADMIN_KEY`:

| Feature | Description |
|---------|-------------|
| **Provider Keys** | Manage API keys with connectivity testing |
| **Quota Config** | Dynamic per-provider quotas, KV-persisted |
| **Model Testing** | Test connectivity and response for specific models |
| **Temporary Keys** | Generate HMAC-SHA256 signed time-limited keys |
| **Custom Providers** | Add / edit / delete custom providers |
| **Usage Stats** | Request counts + token usage trends |
| **Key Pool Status** | Real-time sync of all key states |
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

## 🏁 Comparison with Similar Projects

| Feature | AI Relay | OpenRouter | OneAPI / new-api | FastGPT |
|---------|----------|------------|------------------|---------|
| **Deployment** | Vercel one-click (Edge) | SaaS only | Self-hosted (Docker) | Self-hosted (Docker) |
| **Infra Cost** | Free | Pay-per-use | Requires server | Requires server |
| **Cold Start** | < 50ms | N/A | Seconds | Seconds |
| **Circuit Breaker** | ✅ | ❌ | ❌ | ❌ |
| **Fallback Chains** | ✅ Configurable | ✅ Auto | ✅ Basic | ✅ Basic |
| **Concurrency** | ✅ Token bucket + queue | Rate-limited | ❌ | ❌ |
| **Webhook Alerts** | ✅ 4 platforms | ❌ | ❌ | ✅ |
| **Temp API Keys** | ✅ HMAC signed | ❌ | ✅ | ✅ |
| **Primary Use Case** | Personal / small team | API marketplace | Multi-key mgmt | Knowledge base + API |

**Choose AI Relay:** Zero-cost, serverless, 2-minute deploy, multi-provider failover, Edge low-latency.

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

<!-- Format rules (delete after submitting):
Format for each member:
<img src="docs/assets/avatars/your-avatar.png" width="100" height="100" alt="Name">

### Name
- **Role**: Your role
- **Contribution**: Your core work (1-2 sentences)
- **Contact**: Email

Notes:
1. Place avatar images in docs/assets/avatars/
2. Use your real name or commonly used name
3. Use izmw.me corporate email
4. Be specific about contributions
5. Commit with your own git identity (name + email)
-->

<!-- Team members start -->

<img src="https://avatars.githubusercontent.com/u/35733668?v=4" width="100" height="100" alt="Parsifal">

### Parsifal
- **Role**: Founder & Project Lead
- **Contribution**: Project initiator, responsible for overall architecture design, technology selection, and team management
- **Contact**: zmw@izmw.me

<img src="https://avatars.githubusercontent.com/u/286714101?v=4" width="100" height="100" alt="小赫">

### 小赫 (Xiaohe)
- **Role**: Coordinator
- **Contribution**: Team task coordination, requirements analysis, progress tracking, and quality assurance
- **Contact**: xiaohe@izmw.me


<img src="https://avatars.githubusercontent.com/u/286719582?v=4" width="100" height="100" alt="Pixiel">

### Pixiel (像素姐)
- **Role**: Design Director
- **Contribution**: Brand visual identity design, Logo design, UI/UX design, and README visual polish
- **Contact**: pixiel@izmw.me

<img src="https://avatars.githubusercontent.com/u/286715358?v=4" width="100" height="100" alt="码飞">

### 码飞 (Mafei)
- **Role**: Technical Director
- **Contribution**: Full-stack architecture development, CI/CD pipeline engineering, system performance optimization, and technology evaluation
- **Contact**: mafei@izmw.me

<!-- Team members end -->

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

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
