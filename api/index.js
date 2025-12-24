import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import routes from "../routes/index.js";
import "../config/database.js"; // ensure DB connection

const app = express();

/* =========================
   Middleware
========================= */
app.use(
  cors({
    origin: "http://localhost:5173", // frontend
    credentials: true,
  })
);

app.use(bodyParser.json());

// Session middleware (required for admin login)
app.use(
  session({
    secret: "your-secret-key", // TODO: use a strong secret in production!
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set to true if using HTTPS
  })
);

/* =========================
   Routes
========================= */
app.use("/api", routes);

/* =========================
   Serverless export
========================= */
export const handler = serverless(app);

/* =========================
   Local development server
========================= */
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}
