import dns from "node:dns";
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(","));
}

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import http from "node:http";
import { initSocket } from "./sockets/index.js";

const app = express();

//middlewares
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

//routes

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/leads", leadRoutes);

//central error handler
app.use((err, req, res, next) => {
  if (err.status) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const start = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`),
  );
};

start().catch((err) => {
  console.error("Failed to start", err);
  process.exit(1);
});
