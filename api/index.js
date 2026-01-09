const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const pg = require('pg');
const ConnectPgSimple = require('connect-pg-simple');

let cachedApp = null;
let cachedLambdaHandler = null;

async function createApp() {
  if (cachedApp) return cachedApp;

  const app = express();

  // Request logging (optional)
  try {
    const morgan = require('morgan');
    app.use(morgan(process.env.LOG_FORMAT || 'combined'));
  } catch (e) {
    console.log('createApp: start');
    // ignore
  }

  // Structured logger (optional)
  try {
    const winston = require('winston');
    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      transports: [new winston.transports.Console({ format: winston.format.simple() })],
    });
    app.locals.logger = logger;
  } catch (e) {
    // ignore
  }

  // Standard middleware
  app.use(
    cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true })
  );
  app.use(bodyParser.json());

  // Fast health endpoint for serverless probes
  app.get('/api/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

  // also expose short /health for external checks
  app.get('/health', (req, res) => res.json({ ok: true }));

  // lightweight debug note that health routes are registered
  console.log('createApp: health route registered');

  // Session store (best-effort)
  try {
    const sessionOptions = {
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    };

    if (process.env.DATABASE_URL) {
      const Pool = pg.Pool || pg.Client;
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const PgSession = ConnectPgSimple(session);
      sessionOptions.store = new PgSession({ pool, tableName: 'session' });
      console.log('Using Postgres session store');
    }

    app.use(session(sessionOptions));
  } catch (e) {
    console.error('Session store init failed, falling back to MemoryStore:', e && e.message ? e.message : e);
    app.use(session({ secret: process.env.SESSION_SECRET || 'your-secret-key', resave: false, saveUninitialized: false }));
  }

  try {
    // Deferred mount of application routes. Attempting to require heavy route files
    // at cold start can block serverless startup if DB or other services are slow.
    // We'll mount routes asynchronously to keep the handler responsive for health checks.
    let routesMounted = false;

    // Database sync: in production, do not block startup unless AUTO_SYNC === 'true'
    const shouldAutoSync = process.env.AUTO_SYNC === 'true' || process.env.NODE_ENV !== 'production';
    if (shouldAutoSync) {
      try {
        const sequelize = require('../config/database');
        if (process.env.NODE_ENV === 'production' && process.env.AUTO_SYNC !== 'true') {
          // skip blocking sync in production
        } else if (process.env.NODE_ENV === 'production') {
          // run async in production
          sequelize.sync({ alter: true })
            .then(() => console.log('Database synced (alter)'))
            .catch((syncErr) => console.error('Database sync failed:', syncErr));
        } else {
          // development: await sync so tests and dev flow are consistent
          await sequelize.sync({ alter: true });
          console.log('Database synced (alter)');
        }
      } catch (e) {
        console.error('Database init failed:', e && e.message ? e.message : e);
      }
    }

    // In case routes couldn't be required earlier (cold-start), mount asynchronously
    (async () => {
      // attempt to mount routes asynchronously; this avoids blocking cold-start
      try {
        const routesModule = require('../routes');
        app.use('/api', routesModule.default || routesModule);
        routesMounted = true;
        console.log('Routes mounted asynchronously');
      } catch (e) {
        // If routes fail to load asynchronously, log and continue
        console.log('createApp: skipping sync routes require');
        console.error('Deferred routes mount failed:', e && e.message ? e.message : e);
      }
    })();

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

// Also expose default for Vercel compatibility
module.exports.default = module.exports.handler;

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

