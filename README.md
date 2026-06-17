<div align="center">

# MiMo Code API

**REST API обёртка над [MiMo Code CLI](https://github.com/nicepkg/mimocode)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)

Отправляйте промпты через HTTP и получайте ответы от ИИ моделей.
Идеально для интеграции AI в приложения, ботов и автоматизацию.

</div>

---

## Quick Start

```bash
git clone https://github.com/Pcuxxx/mimo-api.git
cd mimo-api
npm install
cp .env.example .env
npm start
```

## Configuration

Создайте `.env` файл (см. `.env.example`):

```env
# ── Server ──────────────────────────
HOST=0.0.0.0          # Адрес (0.0.0.0 = все интерфейсы)
PORT=3456             # Порт

# ── Model ───────────────────────────
MIMO_MODEL=mimo/mimo-auto

# ── Auth (пусто = выкл) ─────────────
API_KEY=your-secret-key

# ── CORS ────────────────────────────
CORS_ORIGINS=*        # Или: https://myapp.com,https://admin.com

# ── Rate Limiting ───────────────────
RATE_LIMIT_WINDOW_MS=60000   # Окно (мс)
RATE_LIMIT_MAX=60            # Запросов за окно
```

### Деплой на VDS/сервер

```bash
# На сервере
HOST=0.0.0.0
PORT=3456
API_KEY=секретный-ключ
CORS_ORIGINS=https://мойсайт.com
RATE_LIMIT_MAX=100
```

### Доступные переменные

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Адрес для прослушивания |
| `PORT` | `3456` | Порт |
| `MIMO_MODEL` | `mimo/mimo-auto` | Модель по умолчанию |
| `API_KEY` | _(пусто)_ | Ключ авторизации (отключено если пусто) |
| `CORS_ORIGINS` | `*` | Разрешённые origins через запятую |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Окно rate limit (мс) |
| `RATE_LIMIT_MAX` | `60` | Макс. запросов за окно (0 = без лимита) |

---

## API

### Auth

Если `API_KEY` установлен, все запросы требуют заголовок:

```
X-API-Key: your-secret-key
```

---

### `POST /chat`

```bash
curl -X POST http://localhost:3456/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
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
| `dangerously_skip_permissions` | `boolean` | — | Авто-разрешение операций |

---

### `POST /chat/stream`

SSE стриминг — ответ поступает по частям в реальном времени.

```bash
curl -N -X POST http://localhost:3456/chat/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
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
curl http://localhost:3456/models -H "X-API-Key: your-secret-key"
```

```json
{
  "models": ["mimo/mimo-auto", "anthropic/claude-sonnet-4-5", "xiaomi/mimo-v2.5-pro", ...]
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
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "your-secret-key",
  },
  body: JSON.stringify({ prompt: "Hello!" }),
});
const { response } = await res.json();
```

### Python

```python
import requests

r = requests.post(
    "http://localhost:3456/chat",
    json={"prompt": "Hello!"},
    headers={"X-API-Key": "your-secret-key"}
)
print(r.json()["response"])
```

## Requirements

- **Node.js** 18+
- **MiMo Code CLI** — `npm i -g @mimo-ai/cli`
- **Настроенный провайдер** — `mimo providers`

## License

[MIT](LICENSE)
