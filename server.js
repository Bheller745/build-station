/**
 * Build Station — Airtable Proxy Server
 * Run with: node server.js
 * Requires: npm install express cors node-fetch
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname)));

// ── Proxy all Airtable requests ──────────────────────────
// GET  /api/airtable/:base/:table?params...
// GET  /api/airtable/:base/:table/:recordId
// PATCH /api/airtable/:base/:table/:recordId

app.all('/api/airtable/:base/:table/:recordId?', async (req, res) => {
  const { base, table, recordId } = req.params;
  const token = req.headers['x-airtable-token'];

  if (!token) {
    return res.status(401).json({ error: { message: 'Missing x-airtable-token header' } });
  }

  // Build Airtable URL
  let atUrl = `https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`;
  if (recordId) atUrl += `/${recordId}`;

  // Forward query params for GET requests
  if (req.method === 'GET' && Object.keys(req.query).length) {
    const qs = new URLSearchParams(req.query).toString();
    atUrl += `?${qs}`;
  }

  const fetchOptions = {
    method: req.method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (req.method === 'PATCH' || req.method === 'POST') {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const atRes = await fetch(atUrl, fetchOptions);
    const data = await atRes.json();
    res.status(atRes.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
});

app.listen(PORT, () => {
  console.log(`\n✓ Build Station running at http://localhost:${PORT}`);
  console.log(`  Open http://localhost:${PORT} in your browser\n`);
});
