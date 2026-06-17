<div align="center">

# MiMo Code API

**REST API обёртка над [MiMo Code CLI](https://github.com/nicepkg/mimocode)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

Отправляйте промпты через HTTP и получайте ответы от ИИ моделей.
Идеально для интеграции AI в свои приложения, ботов и автоматизацию.

</div>

---

## Quick Start

```bash
git clone https://github.com/PsiXoPlayer/mimo-api.git
cd mimo-api
npm install
npm start
```

Сервер: `http://localhost:3456`

## API Reference

### `POST /chat`

Отправить промпт, получить ответ.

```bash
curl -X POST http://localhost:3456/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing in 3 sentences"}'
```

**Response:**

```json
{
  "id": "a1b2c3d4-...",
  "model": "mimo/mimo-auto",
  "response": "Quantum computing uses...",
  "exitCode": 0
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | ✅ | Текст запроса |
| `session` | `string` | — | ID сессии для продолжения диалога |
| `dangerously_skip_permissions` | `boolean` | — | Авто-разрешение операций (⚠️小心使用) |

---

### `POST /chat/stream`

SSE стриминг — ответ поступает по частям в реальном времени.

```bash
curl -N -X POST http://localhost:3456/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a haiku about coding"}'
```

**Event format:**

```
data: {"type":"text","part":{"text":"..."}}
data: {"type":"done","exitCode":0}
```

---

### `GET /models`

```bash
curl http://localhost:3456/models
```

```json
{
  "models": [
    "mimo/mimo-auto",
    "anthropic/claude-sonnet-4-5",
    "xiaomi/mimo-v2.5-pro",
    ...
  ]
}
```

---

### `GET /health`

```bash
curl http://localhost:3456/health
```

```json
{
  "status": "ok",
  "model": "mimo/mimo-auto",
  "uptime": 142.5
}
```

## Examples

### JavaScript

```javascript
const res = await fetch("http://localhost:3456/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "Hello, world!" }),
});

const { response } = await res.json();
console.log(response);
```

### Python

```python
import requests

r = requests.post(
    "http://localhost:3456/chat",
    json={"prompt": "Hello, world!"}
)
print(r.json()["response"])
```

### cURL

```bash
curl -s -X POST http://localhost:3456/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello!"}' | jq .response
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Порт сервера |
| `MIMO_MODEL` | `mimo/mimo-auto` | Модель по умолчанию |

## Requirements

- **Node.js** 18+
- **MiMo Code CLI** — `npm i -g @mimo-ai/cli`
- **Настроенный провайдер** — `mimo providers`

## License

[MIT](LICENSE)
