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

  // Request logging
  try {
    const morgan = require('morgan');
    app.use(morgan(process.env.LOG_FORMAT || 'combined'));
  } catch (e) {
    // ignore if morgan not available
  }

  // Basic structured logger
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

  // Common middleware
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(bodyParser.json());

  // lightweight health endpoint (fast, no DB init)
  app.get('/api/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

  // Session store: use Postgres-backed store when DATABASE_URL provided
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
    // require routes and DB config
    let routesModule;
    try {
      routesModule = require('../routes');
    } catch (e) {
      console.error('Failed to load routes:', e);
    }

    try {
      const sequelize = require('../config/database');
      // In production we avoid blocking startup with DB sync unless explicitly enabled.
      const shouldSync = process.env.AUTO_SYNC === 'true' || process.env.NODE_ENV !== 'production';
      if (shouldSync) {
        // Run sync but don't block startup in production. Await in non-production for safety.
        if (process.env.NODE_ENV === 'production' && process.env.AUTO_SYNC === 'true') {
          sequelize.sync({ alter: true })
            .then(() => console.log('Database synced (alter)'))
            .catch((syncErr) => console.error('Database sync failed:', syncErr));
        } else {
          await sequelize.sync({ alter: true });
          console.log('Database synced (alter)');
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

// Vercel and some serverless platforms expect the module default to be the handler function.
// Keep `module.exports.handler` for tests and also expose default for platforms.
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
