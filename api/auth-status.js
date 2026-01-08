module.exports = async function handler(req, res) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || null;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || null;
  const frontendUrl = process.env.FRONTEND_URL || null;

  return res.json({
    googleConfigured: !!(googleClientId && googleClientSecret),
    frontendUrl,
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      dbSsl: process.env.DB_SSL || null
    }
  });
};
