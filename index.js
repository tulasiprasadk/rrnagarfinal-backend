const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require("body-parser");
const { sequelize } = require("./models");

const customerAuthRoutes = require("./routes/customer/auth");
const customerProfileRoutes = require("./routes/customer/profile");

const app = express();

// ------------------ CORS ------------------
// Allow Vite dev servers on common localhost ports (5173/5174)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow curl/postman
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow any localhost:51xx dev port just in case Vite picks a new one
      if (/^http:\/\/(localhost|127\.0\.0\.1):51\d{2}$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ------------------ MIDDLEWARES ------------------
app.use(bodyParser.json({ charset: 'utf-8' }));
app.use(bodyParser.urlencoded({ extended: true, charset: 'utf-8' }));

// Set default charset for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Session debugging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} | Session ID: ${req.sessionID || 'none'} | Customer: ${req.session?.customerId || 'none'}`);
  next();
});

app.use(
  session({
    secret: "rrnagar-secret-key",
    resave: false,
    saveUninitialized: false, // Don't create session until something is stored
    name: 'rrnagar.sid', // Custom cookie name
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: 'lax',
      path: '/'
    }
  })
);

// ------------------ ROUTES ------------------
// Customer routes
app.use("/api/auth", customerAuthRoutes);
app.use("/api/customer/profile", customerProfileRoutes);
app.use("/api/customer/address", require("./routes/customer/address"));
app.use("/api/customer/dashboard-stats", require("./routes/customer/dashboard-stats"));
app.use("/api/customer/payment", require("./routes/customer/payment"));

// Admin routes
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin/orders", require("./routes/admin/orders"));
app.use("/api/admin/notifications", require("./routes/admin/notifications"));
app.use("/api/admin/payments", require("./routes/admin-payments"));

// Supplier routes
app.use("/api/supplier/orders", require("./routes/supplier/orders"));
app.use("/api/suppliers", require("./routes/suppliers"));

// General routes
app.use("/api/products", require("./routes/products"));
app.use("/api/categories", require("./routes/categories"));
// app.use("/api/varieties", require("./routes/varieties")); // Temporarily disabled
app.use("/api/orders", require("./routes/orders"));
app.use("/api/shops", require("./routes/shops"));
app.use("/api/stock", require("./routes/stock"));
app.use("/api/ads", require("./routes/ads"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api", require("./routes/partner"));

// Static files
app.use("/uploads", express.static("uploads"));

// Graceful shutdown handlers
let server = null;
let isShuttingDown = false;

// ---- Rest of file continues below ----

// ... middleware and routes ...

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: err.message });
});

// ------------------ DB SYNC ------------------
sequelize
  .sync() // avoid alter to prevent FK issues on dev data
  .then(() => {
    console.log("📦 Database synced successfully!");
    
    // Start server after DB is ready
    server = app.listen(4000, () => {
      console.log("🚀 RR Nagar backend running on http://localhost:4000");
    });
    
    server.on('error', (err) => {
      console.error("❌ Server error:", err);
    });
  })
  .catch((err) => {
    console.error("❌ Database sync error:", err);
    process.exit(1);
  });

// Handle uncaught errors (logging only during development)
process.on('uncaughtException', (err) => {
  console.error("❌ Uncaught Exception:", err);
  // Don't exit in development - just log
  // process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error("❌ Unhandled Rejection:", err);
  // Don't exit in development - just log
  // process.exit(1);
});

process.on('SIGINT', () => {
  if (isShuttingDown) return; // Prevent multiple shutdowns
  isShuttingDown = true;
  
  console.log('\n👋 Shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      console.log('Force exiting...');
      process.exit(0);
    }, 5000); // Wait 5 seconds before forced exit
  } else {
    process.exit(0);
  }
});

console.log('✅ Server process started. Press Ctrl+C to stop.');

