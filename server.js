const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3456;
const MODEL = process.env.MIMO_MODEL || 'mimo/mimo-auto';

const mimoRun = (prompt, opts = {}) =>
  new Promise((resolve, reject) => {
    const args = ['run', '--format', 'json', '-m', MODEL];
    if (opts.session) args.push('-s', opts.session);
    if (opts.continue_session) args.push('-c');
    if (opts.dangerously_skip_permissions) args.push('--dangerously-skip-permissions');
    args.push(prompt);

    const proc = spawn('mimo', args, { shell: true, env: { ...process.env } });
    proc.stdin.end();

    let stdout = '';
    let stderr = '';
    const events = [];

    proc.stdout.on('data', (chunk) => {
      stdout += chunk;
      chunk
        .toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => {
          try { events.push(JSON.parse(line)); } catch {}
        });
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Request timed out after 120s'));
    }, 120_000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      const text = events
        .filter((e) => e.type === 'text' && e.part?.text)
        .map((e) => e.part.text)
        .join('\n');
      resolve({ text: text || stdout.trim(), exitCode: code, stderr: stderr.trim(), events });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

const parseModels = (raw) =>
  raw
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name: 'MiMo Code API',
    version: '1.0.0',
    model: MODEL,
    endpoints: {
      'POST /chat': 'Send a prompt, receive a response',
      'POST /chat/stream': 'SSE streaming',
      'GET /models': 'List available models',
      'GET /health': 'Health check',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: MODEL, uptime: process.uptime() });
});

app.get('/models', (_req, res) => {
  exec('mimo models', (err, stdout) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ models: parseModels(stdout) });
  });
});

app.post('/chat', async (req, res) => {
  try {
    const { prompt, session, dangerously_skip_permissions } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: '`prompt` (string) is required' });
    }

    const result = await mimoRun(prompt, { session, dangerously_skip_permissions });

    res.json({
      id: uuidv4(),
      model: MODEL,
      response: result.text,
      exitCode: result.exitCode,
      ...(result.stderr && { stderr: result.stderr }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/chat/stream', async (req, res) => {
  try {
    const { prompt, session, dangerously_skip_permissions } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: '`prompt` (string) is required' });
    }

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

    let buffer = '';
    const send = (data) => {
      buffer += data;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try { res.write(`data: ${trimmed}\n\n`); } catch {}
        }
      }
    };

    proc.stdout.on('data', send);
    proc.stderr.on('data', send);

    proc.on('close', (code) => {
      if (buffer.trim()) res.write(`data: ${buffer.trim()}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', exitCode: code })}\n\n`);
      res.end();
    });

    proc.on('error', (err) => {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    });

    req.on('close', () => proc.kill());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[mimo-api] listening on http://localhost:${PORT}`);
  console.log(`[mimo-api] model: ${MODEL}`);
});
