import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import bodyParser from "body-parser";
import routes from "../routes/index.js";
import "../config/database.js";   // ensures DB connects

const app = express();
app.use(cors());
app.use(bodyParser.json());

// all backend routes
app.use("/api", routes);

export const handler = serverless(app);
