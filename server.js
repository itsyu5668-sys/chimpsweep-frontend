import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;
const API_URL = process.env.VITE_API_URL || 'https://chimpsweep-backend.onrender.com';

// Proxy API calls to backend - MUST come before static files
app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  secure: false,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.path} -> ${API_URL}/api${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Proxy failed' });
  }
}));

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ChimpSweep Frontend running on port ${PORT}`);
});