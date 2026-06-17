# MiMo Code API

REST API обёртка над [MiMo Code CLI](https://github.com/nicepkg/mimocode). Отправляйте промпты через HTTP и получайте ответы от ИИ.

## Быстрый старт

```bash
git clone <repo-url> && cd mimo-api
npm install
node server.js
```

Сервер запустится на `http://localhost:3456`.

## API

### `POST /chat`

```bash
curl -X POST http://localhost:3456/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Привет!"}'
```

**Response:**
```json
{
  "id": "uuid",
  "model": "mimo/mimo-auto",
  "response": "Привет! Чем могу помочь?",
  "exitCode": 0
}
```

**Body параметры:**
| Поле | Тип | Описание |
|------|-----|----------|
| `prompt` | string | **Обязательно.** Текст запроса |
| `session` | string | ID сессии для продолжения диалога |
| `dangerously_skip_permissions` | boolean | Авто-разрешение операций |

### `POST /chat/stream`

SSE стриминг — ответ приходит по частям.

```bash
curl -N -X POST http://localhost:3456/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Расскажи анекдот"}'
```

### `GET /models`

```bash
curl http://localhost:3456/models
```

### `GET /health`

```bash
curl http://localhost:3456/health
```

## Примеры

### Node.js

```js
const res = await fetch('http://localhost:3456/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Напиши hello world на Python' })
});
const { response } = await res.json();
console.log(response);
```

### Python

```python
import requests

r = requests.post('http://localhost:3456/chat', json={"prompt": "Привет"})
print(r.json()["response"])
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `3456` | Порт сервера |
| `MIMO_MODEL` | `mimo/mimo-auto` | Модель для запросов |

## Запуск/остановка

```powershell
.\start.ps1   # запустить
.\stop.ps1    # остановить
```

## Требования

- Node.js 18+
- MiMo Code CLI (`npm i -g @mimo-ai/cli`)
- Настроенный провайдер (`mimo providers`)
