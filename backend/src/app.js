"use strict";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");

const { env } = require("./config/env");
const routes = require("./routes/index");
const { errorMiddleware } = require("./middlewares/error.middleware");
const { notFoundMiddleware } = require("./middlewares/notFound.middleware");
const { apiRateLimit } = require("./middlewares/rateLimit.middleware");

const app = express();

// ── Security headers ─────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
app.use(
  cors({
    origin: [env.FRONTEND_URL, env.APP_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Compression ───────────────────────────────────────────────
app.use(compression());

// ── Request logging ───────────────────────────────────────────
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.IS_PRODUCTION ? "combined" : "dev"));
}

// ── Trust proxy (khi chạy sau Nginx/Load Balancer) ───────────
app.set("trust proxy", 1);

// ── Health check ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── Rate limit cho toàn bộ API ───────────────────────────────
app.use("/api", apiRateLimit);

// ── API Routes ────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 handler ───────────────────────────────────────────────
app.use(notFoundMiddleware);

// ── Global error handler (phải đặt cuối cùng) ────────────────
app.use(errorMiddleware);

module.exports = app;
