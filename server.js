const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3456;
const MODEL = process.env.MIMO_MODEL || 'mimo/mimo-auto';

function mimoRun(prompt, opts = {}) {
  return new Promise((resolve, reject) => {
    const args = ['run', '--format', 'json', '-m', MODEL];
    if (opts.session) args.push('-s', opts.session);
    if (opts.continue_session) args.push('-c');
    if (opts.dangerously_skip_permissions) args.push('--dangerously-skip-permissions');
    args.push(prompt);

    const proc = spawn('mimo', args, { shell: true, env: { ...process.env } });
    proc.stdin.end();

    let out = '';
    let err = '';
    const events = [];

    proc.stdout.on('data', d => {
      out += d;
      d.toString().split(/\r?\n/).filter(Boolean).forEach(line => {
        try { events.push(JSON.parse(line)); } catch {}
      });
    });
    proc.stderr.on('data', d => { err += d; });

    const timer = setTimeout(() => { proc.kill(); reject(new Error('timeout')); }, 120000);
    proc.on('close', code => {
      clearTimeout(timer);
      const text = events.filter(e => e.type === 'text' && e.part?.text).map(e => e.part.text).join('\n');
      resolve({ text: text || out.trim(), exitCode: code, stderr: err.trim(), events });
    });
    proc.on('error', e => { clearTimeout(timer); reject(e); });
  });
}

app.get('/', (req, res) => {
  res.json({
    name: 'MiMo Code API',
    model: MODEL,
    usage: {
      'POST /chat': { body: { prompt: 'string (required)', session: 'string?', dangerously_skip_permissions: 'boolean?' } },
      'POST /chat/stream': 'SSE — Server-Sent Events',
      'GET /models': 'List available models',
      'GET /health': 'Health check'
    },
    example: 'curl -X POST http://localhost:' + PORT + '/chat -H "Content-Type: application/json" -d \'{"prompt":"Hello"}\''
  });
});

app.get('/health', (req, res) => res.json({ ok: true, model: MODEL, port: PORT }));

app.get('/models', (req, res) => {
  exec('mimo models', (e, stdout) => {
    if (e) return res.status(500).json({ error: e.message });
    res.json({ models: stdout.trim().split(/\r?\n/).filter(Boolean) });
  });
});

app.post('/chat', async (req, res) => {
  try {
    const { prompt, session, dangerously_skip_permissions } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const r = await mimoRun(prompt, { session, dangerously_skip_permissions });
    res.json({ id: uuidv4(), model: MODEL, response: r.text, exitCode: r.exitCode, stderr: r.stderr || undefined });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/chat/stream', async (req, res) => {
  try {
    const { prompt, session, dangerously_skip_permissions } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const args = ['run', '--format', 'json', '-m', MODEL];
    if (session) args.push('-s', session);
    if (dangerously_skip_permissions) args.push('--dangerously-skip-permissions');
    args.push(prompt);

    const proc = spawn('mimo', args, { shell: true, env: { ...process.env } });
    proc.stdin.end();

    let buf = '';
    const onData = d => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() || '';
      for (const l of lines) {
        const t = l.trim();
        if (t) try { res.write(`data: ${t}\n\n`); } catch {}
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('close', code => {
      if (buf.trim()) res.write(`data: ${buf.trim()}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', exitCode: code })}\n\n`);
      res.end();
    });

    proc.on('error', err => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    });

    req.on('close', () => proc.kill());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`MiMo API → http://localhost:${PORT}  model=${MODEL}`));
