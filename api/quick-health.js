// Minimal Vercel serverless function to verify quick execution
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true, source: 'quick-health', now: new Date().toISOString() });
};
