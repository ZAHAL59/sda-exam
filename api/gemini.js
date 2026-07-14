// api/gemini.js  —  Vercel Serverless Function
// Proxies requests to Gemini so the API key never leaves the server.
// Set GEMINI_API_KEY in Vercel → Project Settings → Environment Variables.

export const config = { maxDuration: 60 };

const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export default async function handler(req, res) {
  // CORS – tighten origin in production if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set on the server.' });
  }

  const { model = 'gemini-2.5-flash', body } = req.body || {};

  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: `Model "${model}" is not allowed.` });
  }

  if (!body) return res.status(400).json({ error: 'Missing body field.' });

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || 'Gemini API error' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}