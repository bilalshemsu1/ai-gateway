# API Reference

This gateway exposes an OpenAI-style chat endpoint plus a public provider-status endpoint.

## Base URL

By default the server listens on `http://localhost:3001`.

## Authentication

The chat endpoint requires a Bearer token:

`Authorization: Bearer <API_SECRET>`

Set `API_SECRET` in your `.env` file. If the header is missing or the token is wrong, the server returns `401`.

## Endpoints

### `GET /`

Simple service status endpoint.

Response:

```json
{
  "name": "AI Gateway",
  "version": "0.1.0",
  "status": "running"
}
```

### `GET /health`

Health check with provider status. No authentication required.

Response shape:

```json
{
  "status": "ok",
  "providers": {
    "Groq": {
      "requests": 2,
      "available": true
    }
  }
}
```

Each provider entry includes:

- `requests`: how many successful requests were routed to that provider
- `available`: whether the provider passed its availability check

### `GET /v1/providers`

Lists provider status. No authentication required.

Response shape is the same provider map returned inside `/health`.

### `POST /v1/chat/completions`

OpenAI-compatible chat endpoint.

Required headers:

- `Content-Type: application/json`
- `Authorization: Bearer <API_SECRET>`

Request body:

```json
{
  "model": "auto",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

Body rules enforced by the server:

- `messages` must be a non-empty array
- every message must have both `role` and `content`
- at least one message must use the `user` role
- the last `user` message is used as the prompt
- the prompt content must be 10,000 characters or less
- `model` is optional; if omitted, it defaults to `auto`

Important behavior:

- the server only uses the last user message as the prompt
- provider selection is automatic and based on least-busy failover order
- if one provider fails, the gateway tries the next provider
- each provider call has a 30 second timeout

Success response:

```json
{
  "id": "chatcmpl-1234567890-abc123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "llama-3.1-8b-instant",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hi! How can I help?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  },
  "provider": "Groq",
  "response_time": 450
}
```

Error responses:

`400 invalid_messages`

```json
{
  "error": {
    "message": "Invalid request: \"messages\" must be a non-empty array",
    "type": "invalid_request_error",
    "code": "invalid_messages"
  }
}
```

`400 invalid_message_format`

```json
{
  "error": {
    "message": "Invalid request: each message must have \"role\" and \"content\"",
    "type": "invalid_request_error",
    "code": "invalid_message_format"
  }
}
```

`400 no_user_message`

```json
{
  "error": {
    "message": "Invalid request: at least one user message required",
    "type": "invalid_request_error",
    "code": "no_user_message"
  }
}
```

`400 prompt_too_long`

```json
{
  "error": {
    "message": "Invalid request: prompt too long (max 10000 characters)",
    "type": "invalid_request_error",
    "code": "prompt_too_long"
  }
}
```

`401 Unauthorized`

Returned when the bearer token is missing or incorrect.

`429 rate_limit_exceeded`

Returned after 15 requests per minute per IP.

```json
{
  "error": {
    "message": "Rate limit exceeded. Try again in 12 seconds.",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  },
  "retry_after": 12
}
```

`503 no_providers`

Returned when no provider API keys are configured.

`500 all_providers_failed`

Returned when every configured provider fails or times out.

## Example Requests

### cURL

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-secret" \
  -d '{
    "model": "auto",
    "messages": [
      {"role": "system", "content": "You are helpful."},
      {"role": "user", "content": "Write a one-line summary of this project."}
    ]
  }'
```

### JavaScript

```js
const response = await fetch('http://localhost:3001/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer your-api-secret'
  },
  body: JSON.stringify({
    model: 'auto',
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  })
});

const data = await response.json();
```

## Runtime Notes

- Auth is enforced only on `/v1/chat/completions`
- `/health` and `/v1/providers` are public
- provider availability is cached for 5 minutes
- provider selection uses request counts to prefer the least busy provider
- only providers with API keys in the environment are registered at startup