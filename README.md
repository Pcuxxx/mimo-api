<div align="center">

# MiMo Code API

**Production-ready REST API for [MiMo Code CLI](https://github.com/nicepkg/mimocode)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)

Send prompts via HTTP, get AI responses. Clustered, rate-limited, authenticated.
Works everywhere — from a hobby project to enterprise infrastructure.

</div>

---

## Quick Start

```bash
git clone https://github.com/Pcuxxx/mimo-api.git && cd mimo-api
npm install && cp .env.example .env && npm start
```

---

## SDK — 2 строки в вашем коде

### JavaScript / TypeScript

```js
import MiMoClient from './sdk/client.js';

const ai = new MiMoClient({ url: 'http://localhost:3456', apiKey: 'secret' });

// обычный запрос
const { response } = await ai.chat('Привет!');

// стриминг
for await (const event of ai.chatStream('Расскажи анекдот')) {
  if (event.type === 'text') process.stdout.write(event.part.text);
}
```

### Python

```python
from sdk.client import MiMoClient

ai = MiMoClient(url="http://localhost:3456", api_key="secret")

# обычный запрос
print(ai.chat("Привет!")["response"])

# стриминг
for event in ai.chat_stream("Расскажи анекдот"):
    if event.get("type") == "text":
        print(event["part"]["text"], end="")
```

### cURL

```bash
curl -X POST http://localhost:3456/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: secret" \
  -d '{"prompt":"Hello!"}'
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat` | Send prompt → get response |
| `POST` | `/chat/stream` | SSE streaming |
| `GET` | `/models` | List available models |
| `GET` | `/health` | Health + metrics |
| `GET` | `/metrics` | Detailed metrics (auth required) |

### `POST /chat`

**Request:**
```json
{
  "prompt": "string (required)",
  "session": "string (optional — for conversation continuity)",
  "dangerously_skip_permissions": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "model": "mimo/mimo-auto",
  "response": "AI answer here",
  "exitCode": 0
}
```

### `POST /chat/stream`

SSE stream. Events:
```
data: {"type":"text","part":{"text":"chunk..."}}
data: {"type":"done","exitCode":0}
```

---

## Configuration

`.env` file or environment variables:

```env
# Server
HOST=0.0.0.0
PORT=3456

# Model
MIMO_MODEL=mimo/mimo-auto

# Auth (empty = disabled)
API_KEY=

# CORS
CORS_ORIGINS=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60

# Performance
WORKERS=8
REQUEST_TIMEOUT_MS=120000
```

### Deploy to VPS / Server

```bash
HOST=0.0.0.0
PORT=443
API_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=https://myapp.com
RATE_LIMIT_MAX=100
WORKERS=8
```

### Deploy with Docker

```bash
docker build -t mimo-api .
docker run -d \
  -p 3456:3456 \
  -e API_KEY=secret \
  -e MIMO_MODEL=mimo/mimo-auto \
  mimo-api
```

---

## Production Features

| Feature | Description |
|---------|-------------|
| **Multi-process** | Node.js cluster, auto-restart dead workers |
| **Rate limiting** | Configurable per-window, per-key |
| **Auth** | API key via `X-API-Key` header |
| **CORS** | Whitelist origins |
| **Graceful shutdown** | SIGTERM/SIGINT handled cleanly |
| **Metrics** | `/health` + `/metrics` endpoints |
| **Timeout** | Configurable request timeout |
| **SDK** | JS + Python client libraries included |

---

## Requirements

- Node.js 18+
- [MiMo Code CLI](https://github.com/nicepkg/mimocode) (`npm i -g @mimo-ai/cli`)
- Configured provider (`mimo providers`)

## License

[MIT](LICENSE)
