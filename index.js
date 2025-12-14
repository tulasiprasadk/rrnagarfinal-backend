/**
 * backend/index.js
 * RR Nagar Backend – FULL FILE
 */

require('dotenv').config();

const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require("body-parser");
const { sequelize } = require("./models");

const customerAuthRoutes = require("./routes/customer/auth");
const customerProfileRoutes = require("./routes/customer/profile");

const app = express();

/* =============================
   CORS CONFIG (CONFIGURABLE)
============================= */
const allowedOrigins = (process.env.CORS_ORIGINS
  || [
    // Local development
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",

    // Production frontend (GitHub Pages)
    "https://tulasiprasadk.github.io",
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow curl, Postman, server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/* =============================
   BODY PARSERS
============================= */
app.use(bodyParser.json({ charset: "utf-8" }));
app.use(bodyParser.urlencoded({ extended: true, charset: "utf-8" }));

// Force UTF-8 JSON responses
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

/* =============================
   SESSION SETUP
============================= */
app.use(
  session({
    secret: "rrnagar-secret-key",
    resave: false,
    saveUninitialized: false,
    name: "rrnagar.sid",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: false, // true only if HTTPS + same domain
      sameSite: "lax",
      path: "/",
    },
  })
);

/* =============================
   SESSION DEBUG LOG
============================= */
app.use((req, res, next) => {
  console.log(
    `📨 ${req.method} ${req.path} | Session: ${req.sessionID || "none"} | Customer: ${req.session?.customerId || "none"}`
  );
  next();
});

/* =============================
   ROUTES
============================= */

// Health check
app.get("/", (req, res) => {
  res.send("RR Nagar Backend Running");
});

// ---- CUSTOMER ----
app.use("/api/auth", customerAuthRoutes);
app.use("/api/customer/profile", customerProfileRoutes);
app.use("/api/customer/address", require("./routes/customer/address"));
app.use("/api/customer/dashboard-stats", require("./routes/customer/dashboard-stats"));
app.use("/api/customer/payment", require("./routes/customer/payment"));
app.use("/api/customer/saved-suppliers", require("./routes/customer/saved-suppliers"));

// ---- ADMIN ----
app.use("/api/admin/auth", require("./routes/admin/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin/orders", require("./routes/admin/orders"));
app.use("/api/admin/notifications", require("./routes/admin/notifications"));
app.use("/api/admin/payments", require("./routes/admin-payments"));

// ---- SUPPLIER ----
app.use("/api/supplier/auth", require("./routes/supplier/auth"));
app.use("/api/supplier/orders", require("./routes/supplier/orders"));
app.use("/api/suppliers", require("./routes/suppliers"));

// ---- GENERAL ----
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/shops", require("./routes/shops"));
app.use("/api/stock", require("./routes/stock"));
app.use("/api/ads", require("./routes/ads"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api", require("./routes/partner"));

// Static uploads
app.use("/uploads", express.static("uploads"));

/* =============================
   GLOBAL ERROR HANDLER
============================= */
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: err.message });
});

/* =============================
   SERVER + DB START
============================= */
let server = null;
let isShuttingDown = false;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("📦 Database synced successfully!");

    server = app.listen(4000, () => {
      console.log("🚀 RR Nagar backend running on http://localhost:4000");
    });

    server.on("error", (err) => {
      console.error("❌ Server error:", err);
    });
  })
  .catch((err) => {
    console.error("❌ Database sync error:", err);
    process.exit(1);
  });

/* =============================
   PROCESS SAFETY
============================= */
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("SIGINT", () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("\n👋 Shutting down gracefully...");
  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
    setTimeout(() => {
      console.log("Force exiting...");
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
});

console.log("✅ Server process started. Press Ctrl+C to stop.");
