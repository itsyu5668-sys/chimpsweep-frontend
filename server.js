import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;
const API_URL = process.env.VITE_API_URL || 'https://chimpsweep-backend.onrender.com';

// Simple proxy for /api/* -> backend
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${API_URL}/api${req.path}`;
    console.log(`Proxy: ${req.method} ${req.path} -> ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(API_URL).host,
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req : undefined,
      redirect: 'manual',
    });
    
    // Forward the response
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    const data = await response.text();
    res.send(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Proxy failed' });
  }
});

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ChimpSweep Frontend running on port ${PORT}`);
});