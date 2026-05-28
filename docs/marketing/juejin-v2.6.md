# 2 分钟部署一个无服务器 AI API 网关？我用 Vercel Edge 做到了

> 🚀 本文介绍 AI Relay —— 一个基于 Vercel Edge Runtime 的无服务器 AI API 中转网关。不用买服务器，不用写后端，点击 Deploy 按钮，2 分钟拥有自己的多 Provider AI Relay。

## 背景：我为什么要做这个项目

作为一个经常折腾各种 AI 应用的开发者，我手头有好几个 Provider 的 API Key：OpenAI、Claude、DeepSeek、MiMo……每个项目都要单独配置，Key 轮换靠手动，故障切换靠运气。

之前用过 OneAPI、new-api 这些自托管方案，功能确实强，但每次部署都要：
- 买一台服务器（或蹭公司的）
- 装 Docker，配 Nginx，搞 SSL
- 定期维护，升级，排障

我就想要一个 **"点一下就跑起来"** 的 AI API 网关，能自动帮我做多 Key 轮换、故障转移、用量统计就够了。

于是 AI Relay 诞生了。

## 核心理念：无服务器 + 一键部署

AI Relay 的设计哲学很简单：

**能不买服务器就不买，能一键部署就不要手动配。**

技术栈选型：
- **Vercel Edge Runtime** —— 全球分发，冷启动 < 50ms，个人项目免费层就够
- **Upstash Redis** —— Serverless Redis，存密钥、配额、用量，按请求计费
- **Next.js 14** —— App Router + Edge API Routes

效果就是：点一下 Deploy 按钮，填 3 个环境变量，2 分钟上线。

## 快速上手

### 第 1 步：一键部署

点击 Deploy with Vercel 按钮（链接在项目 README），填入 3 个环境变量：

| 变量 | 说明 |
|------|------|
| `RELAY_API_KEY` | 客户端请求鉴权密钥（自定义强密码） |
| `RELAY_ADMIN_KEY` | 后台管理登录密钥 |
| `RELAY_SIGNING_SECRET` | 临时 Key 签名密钥 |

### 第 2 步：启用 Redis

在 Vercel Dashboard → Storage → Create Database → Upstash for Redis（Free 套餐），然后 Connect to your project。

### 第 3 步：开始调用

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_RELAY_API_KEY",
    base_url="https://你的项目.vercel.app/v1"
)

# 和平时用 OpenAI 一模一样，只改了 base_url
response = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "你好！"}]
)
print(response.choices[0].message.content)
```

**就这么简单。** 你的 AI API 网关已经跑起来了。

## 核心功能详解

### 1. 多 Provider 支持

内置支持 OpenAI、Claude、DeepSeek、MiMo，也可以添加任意 OpenAI 兼容的自定义 Provider。

```bash
# OpenAI
curl -X POST https://你的项目.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"model": "gpt-5.4", "messages": [...]}'

# Claude（原生 Anthropic Messages 协议）
curl -X POST https://你的项目.vercel.app/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-sonnet", "messages": [...]}'

# DeepSeek
curl -X POST https://你的项目.vercel.app/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"model": "deepseek-v4-pro", "messages": [...]}'
```

### 2. 多 Key 轮换 + 自动退避

每个 Provider 可以配置多个 API Key，系统自动 Round-Robin 轮换。遇到 429 (Rate Limit) 时自动退避，切换到下一个可用 Key。

```
请求 → Key1 (429) → 自动退避 → Key2 (OK) → 返回响应
```

### 3. 多级 Fallback 链

当整个 Provider 不可用时，自动切换到下一个 Provider：

```
OpenAI (故障) → Claude (故障) → DeepSeek (OK) → 返回响应
```

支持配置 Fallback 顺序，也可以用智能路由自动选择。

### 4. 熔断器

这是我觉得最实用的功能之一。当某个 Provider 连续失败时，熔断器会自动打开，短时间内不再请求该 Provider，避免雪崩效应。

```
Provider A 连续 5 次失败 → 熔断器打开 → 30 秒后半开 → 尝试 1 次 → 成功则恢复
```

### 5. 智能路由

v2.5 新增的功能，支持三种路由策略：

- **延迟优先** —— 自动选择当前响应最快的 Provider
- **成本优先** —— 优先使用成本最低的 Provider
- **可用性优先** —— 优先使用健康状态最好的 Provider

系统会实时追踪各 Provider 的延迟，自动选择最优路径。

### 6. Admin 后台

访问 `/admin` 即可管理所有配置：

- **Provider Keys** —— 管理所有 Provider 的 API 密钥，支持连通性测试
- **模型别名** —— CSV 批量导入导出，模型可见性隐藏
- **优先级规则** —— 拖拽排序的路由规则编辑器
- **用量监控** —— 日期筛选、Provider 过滤、趋势图表
- **临时密钥** —— HMAC-SHA256 无状态签名，自动过期
- **Webhook 通知** —— 企业微信 / 飞书 / 钉钉 / Slack

### 7. 流式响应

完美支持 SSE 流式输出，实时透传：

```python
stream = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "讲个故事"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

## 架构设计

```
Client
  ↓
Vercel Edge Runtime（全球分发，<50ms 延迟）
  ├─ 认证鉴权（API Key 校验）
  ├─ 熔断器（故障自动隔离）
  ├─ 多级 Fallback（Provider → Key）
  ├─ Key 轮换（Round-Robin + 429 退避）
  ├─ 智能路由（延迟/成本/可用性）
  └─ Upstash Redis（密钥、配额、用量持久化）
  ↓
上游 Provider（OpenAI / Claude / DeepSeek / 自定义）
```

关键设计决策：

1. **Edge Runtime 而非 Node.js** —— 全球分发，冷启动快，适合中转场景
2. **Upstash Redis 而非传统数据库** —— Serverless，按请求计费，无需运维
3. **无状态设计** —— 临时密钥用 HMAC-SHA256 签名，无需存储

## 与同类项目对比

| 特性 | AI Relay | OneAPI / new-api | OpenRouter |
|------|----------|------------------|------------|
| 部署方式 | **Vercel 一键部署** | 自托管（Docker） | 纯 SaaS |
| 基础设施成本 | **无需服务器** | 需要服务器 | 按量付费 |
| 冷启动 | < 50ms | 秒级 | N/A |
| 熔断器 | ✅ | ❌ | ❌ |
| 并发控制 | ✅ 令牌桶 + 队列 | ❌ | 限流 |
| Webhook 告警 | ✅ 4 平台 | ❌ | ❌ |
| 智能路由 | ✅ 三策略 | ❌ | ✅ 自动 |
| 主要场景 | 个人 / 小团队 | 多 Key 管理 | API 市场 |

**选择 AI Relay 的理由：** 当你想要一个"自己可控的 AI API 网关"，但不想买服务器、维护 Docker 或搭后端时，AI Relay 是更轻的路线。

## 使用场景

| 场景 | 说明 |
|------|------|
| **个人开发者** | 多 Key 整合为单一端点，自动轮换 + 故障转移 |
| **小团队** | 共享中转实例，配额管理，Admin 可见性 |
| **CI/CD** | HMAC 临时密钥，自动过期无需清理 |
| **多地域应用** | Edge 全球 < 50ms，熔断防级联故障 |
| **成本优化** | 智能路由，按延迟/成本/可用性选择 Provider |

## 本地开发

```bash
git clone https://github.com/MoyuFamily/ai-relay.git
cd ai-relay
npm install
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 API Keys
npm run dev  # http://localhost:3000
```

## 总结

AI Relay 解决的核心问题是：**让个人开发者和小团队也能拥有一个可控的 AI API 网关，而不需要运维成本。**

核心优势：
- ✅ **零运维** —— 无服务器架构，不用买服务器、不用搞 Docker
- ✅ **2 分钟部署** —— 点击按钮 + 填环境变量
- ✅ **免费可用** —— 个人项目 Vercel 免费层够用
- ✅ **企业级特性** —— 熔断器、智能路由、Webhook 告警
- ✅ **OpenAI 兼容** —— 现有 SDK 只改 base_url

如果你也在用多个 AI Provider，想要一个轻量但可靠的中转方案，可以试试 AI Relay。

---

**项目地址：** https://github.com/MoyuFamily/ai-relay

**一键部署：** 点击项目 README 中的 Deploy with Vercel 按钮

**欢迎 Star ⭐ 和 PR 🤝**
