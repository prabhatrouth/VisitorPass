import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();

  // Parse JSON payloads (support photo capture base64)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', apiRouter);

  const distPath = path.resolve(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(indexPath);

  // If built dist files exist, serve static assets
  if (hasDist) {
    console.log(`[VisitorPass Server] Serving production build from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res, next) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          next(err);
        }
      });
    });
  } else {
    // If dist/index.html is missing (e.g. Render running 'npm run dev' or build was not run),
    // seamlessly mount Vite middleware so the application never crashes with ENOENT.
    console.log('[VisitorPass Server] dist/index.html not found, mounting Vite middleware mode...');
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VisitorPass Server] listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
