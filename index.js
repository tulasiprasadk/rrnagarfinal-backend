const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes');
require('./config/database'); // ensure DB connection

const app = express();

/* =========================
   Middleware
========================= */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(bodyParser.json());

/* =========================
   Routes
========================= */
app.use("/api", routes);

/* =========================
   Start server (local)
========================= */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
