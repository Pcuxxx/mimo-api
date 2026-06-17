require('dotenv').config();

const cluster = require('cluster');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

// ── Config ──────────────────────────────────────────────────────────────────

const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3456', 10),
  model: process.env.MIMO_MODEL || 'mimo/mimo-auto',
  apiKey: process.env.API_KEY || '',
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '120000', 10),
  workers: parseInt(process.env.WORKERS || String(os.cpus().length), 10),
};

// ── Metrics ─────────────────────────────────────────────────────────────────

const metrics = {
  requests: 0,
  errors: 0,
  activeConnections: 0,
  startTime: Date.now(),
};

// ── Worker ──────────────────────────────────────────────────────────────────

if (cluster.isPrimary) {
  console.log(`[mimo-api] primary ${process.pid} starting ${config.workers} workers`);

  for (let i = 0; i < config.workers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`[mimo-api] worker ${worker.process.pid} died, restarting`);
    cluster.fork();
  });

  process.on('SIGTERM', () => {
    console.log('[mimo-api] SIGTERM received, shutting down gracefully');
    for (const id in cluster.workers) {
      cluster.workers[id].process.kill('SIGTERM');
    }
    process.exit(0);
  });

  process.on('SIGINT', () => {
    for (const id in cluster.workers) {
      cluster.workers[id].process.kill('SIGINT');
    }
    process.exit(0);
  });

} else {
  startServer();
}

function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(cors({ origin: config.corsOrigins }));

  // ── Rate Limiting ───────────────────────────────────────────────────────

  if (config.rateLimitMax > 0) {
    app.use(
      rateLimit({
        windowMs: config.rateLimitWindow,
        max: config.rateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
        message: { error: 'Rate limit exceeded' },
      }),
    );
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  const requireAuth = (req, res, next) => {
    if (!config.apiKey) return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (!key || key !== config.apiKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // ── Request tracking ────────────────────────────────────────────────────

  app.use((_req, res, next) => {
    metrics.requests++;
    metrics.activeConnections++;
    res.on('finish', () => metrics.activeConnections--);
    next();
  });

  // ── Mimo Runner ────────────────────────────────────────────────────────

  const mimoRun = (prompt, opts = {}) =>
    new Promise((resolve, reject) => {
      const args = ['run', '--format', 'json', '-m', config.model];
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
        chunk.toString().split(/\r?\n/).filter(Boolean).forEach((line) => {
          try { events.push(JSON.parse(line)); } catch {}
        });
      });

      proc.stderr.on('data', (chunk) => { stderr += chunk; });

      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('Request timed out'));
      }, config.timeout);

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

  // ── Error handler ──────────────────────────────────────────────────────

  app.use((err, _req, res, _next) => {
    metrics.errors++;
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large' });
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  // ── Routes ─────────────────────────────────────────────────────────────

  app.get('/', (_req, res) => {
    res.json({
      name: 'MiMo Code API',
      version: '2.0.0',
      model: config.model,
      auth: config.apiKey ? 'required' : 'disabled',
      workers: config.workers,
    });
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      model: config.model,
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
      activeConnections: metrics.activeConnections,
      totalRequests: metrics.requests,
      totalErrors: metrics.errors,
      pid: process.pid,
    });
  });

  app.get('/metrics', requireAuth, (_req, res) => {
    res.json({
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
      requests: metrics.requests,
      errors: metrics.errors,
      activeConnections: metrics.activeConnections,
      memoryUsage: process.memoryUsage(),
      pid: process.pid,
    });
  });

  app.get('/models', requireAuth, (_req, res) => {
    exec('mimo models', (err, stdout) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ models: stdout.trim().split(/\r?\n/).filter(Boolean) });
    });
  });

  app.post('/chat', requireAuth, async (req, res) => {
    try {
      const { prompt, session, dangerously_skip_permissions } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: '`prompt` (string) is required' });
      }
      const result = await mimoRun(prompt, { session, dangerously_skip_permissions });
      res.json({
        id: uuidv4(),
        model: config.model,
        response: result.text,
        exitCode: result.exitCode,
        ...(result.stderr && { stderr: result.stderr }),
      });
    } catch (err) {
      metrics.errors++;
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/chat/stream', requireAuth, async (req, res) => {
    try {
      const { prompt, session, dangerously_skip_permissions } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: '`prompt` (string) is required' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const args = ['run', '--format', 'json', '-m', config.model];
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
      metrics.errors++;
      res.status(500).json({ error: err.message });
    }
  });

  // ── Start ──────────────────────────────────────────────────────────────

  app.listen(config.port, config.host, () => {
    console.log(`[mimo-api] worker ${process.pid} listening on http://${config.host}:${config.port}`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────

  const shutdown = () => {
    console.log(`[mimo-api] worker ${process.pid} shutting down`);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
