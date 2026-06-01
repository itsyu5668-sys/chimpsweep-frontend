import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;
const API_URL = process.env.VITE_API_URL || 'https://chimpsweep-backend.onrender.com';

// Handle auth callbacks - redirect browser to proper frontend routes
app.get('/auth/callback', (req, res) => {
  // Mailchimp redirects here, redirect to success page
  res.redirect('/auth/success?' + req.url.split('?')[1]);
});

app.get('/auth/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/auth/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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
    
    // Handle redirects - when backend redirects to frontend, browser needs to navigate
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location && location.startsWith('https://chimpsweep-frontend.onrender.com')) {
        // Redirect the browser to the location
        const newPath = location.replace('https://chimpsweep-frontend.onrender.com', '');
        console.log(`Redirecting to: ${newPath}`);
        return res.redirect(response.status, newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
      }
      // For external redirects (like Mailchimp), forward the redirect
      res.status(response.status);
      res.setHeader('Location', location);
      return res.end();
    }
    
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