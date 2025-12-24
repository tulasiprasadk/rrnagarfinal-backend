import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import routes from "./routes/index.js";
import "./config/database.js"; // ensure DB connection

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
