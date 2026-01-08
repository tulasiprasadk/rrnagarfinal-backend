import { Client } from 'pg';

export default async function handler(req, res) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL not configured' });
  }

  const rejectUnauthorized = (process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=require') || process.env.DB_SSL === 'true' ? { rejectUnauthorized } : false
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW() as now');
    await client.end();
    return res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    console.error('DB test error:', err);
    try { await client.end(); } catch (e) {}
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
import { sequelize } from '../../config/database.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await sequelize.authenticate()
    return res.status(200).json({ ok: true })
  } catch (err) {
    // return the error message for diagnostics (do not leak stack in production)
    const message = err && err.message ? err.message : String(err)
    return res.status(500).json({ ok: false, error: message })
  }
}
