/**
 * MiMo Code API — JavaScript/TypeScript SDK
 *
 * Usage:
 *   import MiMoClient from 'mimo-api/sdk/client.js';
 *   const client = new MiMoClient({ url: 'http://localhost:3456', apiKey: 'key' });
 *   const { response } = await client.chat('Hello!');
 */

class MiMoClient {
  constructor({ url = 'http://localhost:3456', apiKey = '', timeout = 120000 } = {}) {
    this.url = url.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['X-API-Key'] = this.apiKey;
    return h;
  }

  async chat(prompt, opts = {}) {
    const res = await fetch(`${this.url}/chat`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ prompt, ...opts }),
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async *chatStream(prompt, opts = {}) {
    const res = await fetch(`${this.url}/chat/stream`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ prompt, ...opts }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data) {
            try { yield JSON.parse(data); } catch {}
          }
        }
      }
    }
  }

  async models() {
    const res = await fetch(`${this.url}/models`, { headers: this._headers() });
    return res.json();
  }

  async health() {
    const res = await fetch(`${this.url}/health`);
    return res.json();
  }
}

// CommonJS + ESM
if (typeof module !== 'undefined') module.exports = MiMoClient;
export default MiMoClient;
