// MiMo Code API — примеры вызовов

// 1. Простой запрос (curl)
// curl -X POST http://localhost:3456/chat -H "Content-Type: application/json" -d "{\"prompt\":\"Привет!\"}"

// 2. Node.js
const http = require('http');

function mimoChat(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ prompt, ...options });
    const req = http.request({
      hostname: 'localhost',
      port: 3456,
      path: '/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Использование:
// mimoChat('Напиши hello world на Python').then(r => console.log(r.response));

// 3. Python
/*
import requests

def mimo_chat(prompt, port=3456):
    r = requests.post(f'http://localhost:{port}/chat', json={"prompt": prompt})
    return r.json()["response"]

print(mimo_chat("Привет!"))
*/

// 4. Стриминг
/*
const req = http.request({ hostname: 'localhost', port: 3456, path: '/chat/stream', method: 'POST',
  headers: { 'Content-Type': 'application/json' } }, res => {
  res.on('data', c => {
    const lines = c.toString().split('\\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const event = JSON.parse(line.slice(6));
      if (event.type === 'text') process.stdout.write(event.part?.text || '');
    }
  });
});
req.write(JSON.stringify({ prompt: 'Расскажи анекдот' }));
req.end();
*/

module.exports = { mimoChat };
