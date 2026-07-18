# AI Gateway

Open-source AI orchestration service. One API, multiple AI providers.

## Features

- Multiple AI providers (Gemini, Groq, Mistral, OpenRouter, OpenCodeZen, Zydit, Zai, Agnes, Nvidia)
- Automatic failover when a provider fails
- Rate limiting (15 requests/minute per IP)
- Token authentication
- Load balancing across providers
- OpenAI-compatible API format

## Quick Start

```bash
# Clone
git clone https://github.com/bilalshemsu1/ai-gateway.git
cd ai-gateway

# Install
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys and auth token

# Run
npm start
```

## Environment Variables

Create `.env` file:

```
# Auth (required)
API_SECRET=your-secret-token

# AI Providers (at least one required)
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
MISTRAL_API_KEY=your_key
OPENROUTER_API_KEY=your_key
OPENCODE_API_KEY=your_key
ZYDIT_API_KEY=your_key
ZAI_API_KEY=your_key
AGNES_API_KEY=your_key
NVIDIA_API_KEY=your_key
```

Get free API keys:
- Gemini: https://ai.google.dev
- Groq: https://console.groq.com
- Mistral: https://console.mistral.ai
- OpenRouter: https://openrouter.ai
- OpenCodeZen: https://opencode.ai
- Zydit: https://zydit.in
- Zai: https://z.ai
- Agnes: https://apihub.agnes-ai.com
- Nvidia: https://build.nvidia.com

## API

All requests to `/v1/chat` require authentication.

**Chat:**
```bash
curl -X POST http://localhost:3001/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-secret" \
  -d '{"prompt": "Hello", "model": "auto"}'
```

**Response:**
```json
{
  "answer": "Hi! How can I help?",
  "provider": "Groq",
  "model": "llama-3.1-8b-instant",
  "response_time": 450
}
```

**Without auth (fails):**
```bash
curl -X POST http://localhost:3001/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'

# Returns: 401 Unauthorized
```

**Health check (no auth required):**
```bash
curl http://localhost:3001/health
```

**List providers (no auth required):**
```bash
curl http://localhost:3001/v1/providers
```

## How It Works

```
User Request
    ↓
Auth Check (Authorization: Bearer <token>)
    ↓
Rate Limit Check
    ↓
Provider Selection (least busy)
    ↓
Try Provider → Success? Return answer
            → Fail? Try next provider
    ↓
All providers failed? Return error
```

## Supported Providers

| Provider | Free Tier | Speed |
|----------|-----------|-------|
| Groq | 14,400 req/day | Very Fast |
| Gemini | 60 req/min | Fast |
| Mistral | Yes | Fast |
| OpenRouter | Varies | Medium |
| OpenCodeZen | Yes | Medium |
| Zydit | Yes | Fast |
| Zai | Yes | Fast |
| Agnes | Yes | Fast |
| Nvidia | Yes | Fast |

## License

ISC
