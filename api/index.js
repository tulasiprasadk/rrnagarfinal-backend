const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');

let cachedApp = null;
let cachedLambdaHandler = null;

async function createApp() {
  if (cachedApp) return cachedApp;

  const app = express();

  // Common middleware
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(bodyParser.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  try {
    // require routes and DB config
    let routesModule;
    try {
      routesModule = require('../routes');
    } catch (e) {
      console.error('Failed to load routes:', e);
    }

    try {
      const sequelize = require('../config/database');
      // Auto-sync for development or when explicitly enabled
      if (process.env.AUTO_SYNC === 'true' || process.env.NODE_ENV !== 'production') {
        try {
          await sequelize.sync({ alter: true });
          console.log('Database synced (alter)');
        } catch (syncErr) {
          console.error('Database sync failed:', syncErr);
        }
      }
    } catch (e) {
      console.error('Database init failed:', e);
    }

    if (routesModule) app.use('/api', routesModule.default || routesModule);
    cachedApp = app;
    return app;
  } catch (err) {
    console.error('App initialization error:', err);
    app.use((req, res) => {
      res.status(500).json({ error: 'Server initialization error', detail: String(err && err.message ? err.message : err) });
    });
    cachedApp = app;
    return app;
  }
}

module.exports.handler = async (req, res) => {
  if (!cachedLambdaHandler) {
    const app = await createApp();
    cachedLambdaHandler = serverless(app);
  }
  return cachedLambdaHandler(req, res);
};

// Local development server
if (process.env.NODE_ENV !== 'production') {
  (async () => {
    const app = await createApp();
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })();
}
