import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import app from './server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  // --- FRONTEND INTEGRATION ---
  if (process.env.NODE_ENV === 'production') {
    app.use(app.get('express')?.static ? app.get('express').static(path.resolve(__dirname, 'dist')) : (await import('express')).default.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BabáAgendada Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
