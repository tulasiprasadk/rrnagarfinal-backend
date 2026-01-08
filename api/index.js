import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";

let cachedApp = null;
let cachedLambdaHandler = null;

async function createApp() {
  if (cachedApp) return cachedApp;

  const app = express();

  // Common middleware
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    })
  );

  app.use(bodyParser.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  try {
    // dynamic import so initialization errors are caught and return a helpful 500
    const routesModule = await import("../routes/index.js");
    // ensure DB config runs (may be commonjs or esm)
    try {
      await import("../config/database.js");
    } catch (e) {
      // best-effort: require fallback for CommonJS DB modules
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        require('../config/database.js');
      } catch (inner) {
        console.error('Database init failed:', inner);
      }
    }

    app.use("/api", routesModule.default || routesModule);
    cachedApp = app;
    return app;
  } catch (err) {
    console.error("App initialization error:", err);
    // fallback app which returns a 500 with details for any API request
    app.use((req, res) => {
      res.status(500).json({ error: "Server initialization error", detail: String(err && err.message ? err.message : err) });
    });
    cachedApp = app;
    return app;
  }
}

export const handler = async (req, res) => {
  if (!cachedLambdaHandler) {
    const app = await createApp();
    cachedLambdaHandler = serverless(app);
  }
  return cachedLambdaHandler(req, res);
};

// Local development server
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const app = await createApp();
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`);
    });
  })();
}
