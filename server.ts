import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { app } from './server/app.js';
import { start247ServerScheduler } from './server/scheduler.js';

// Load environment variables from .env.local and .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = 3000;

async function startServer() {
  // Start 24/7 background hold scheduler
  start247ServerScheduler();

  // Vite Middleware for Development / Static Fallback for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GoTrack Express full-stack server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
