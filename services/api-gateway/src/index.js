require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const { createProxyMiddleware } = require("http-proxy-middleware");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: "api-gateway" },
  transports: [new winston.transports.Console()],
});

const app = express();

// Stateless JWT Inspection Interceptor Middleware
const verifyAccessGateway = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn(`Unauthenticated request vector blocked at edge: ${req.path}`);
    return res
      .status(401)
      .json({ error: "Missing structural authorization access token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Perform purely mathematical validation at edge scale
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Inject custom internal downstream headers to decouple verification mapping
    req.headers["x-user-id"] = payload.userId;
    req.headers["x-user-role"] = payload.role;

    next();
  } catch (error) {
    logger.error(
      `Access attempt rejected: Expired or corrupted signature context`,
    );
    return res
      .status(403)
      .json({ error: "Access token handshake expired or invalid" });
  }
};

// --- Reverse Proxy Route Mapping Registries ---

// 1. Identity Service Route Map (Open Public Endpoints)
app.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.IDENTITY_SERVICE_URL,
    changeOrigin: true,
    logLevel: "error",
  }),
);

// 2. Catalog Service Route Map (Open Reading, Guarded Writes could be updated later)
app.use(
  "/api/games",
  createProxyMiddleware({
    target: process.env.CATALOG_SERVICE_URL,
    changeOrigin: true,
    logLevel: "error",
  }),
);

// 3. Order Checkout Flow Route Map (Strict Token Guards enforced)
app.use(
  "/api/orders",
  verifyAccessGateway,
  createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL,
    changeOrigin: true,
    logLevel: "error",
    onProxyReq: (proxyReq, req, res) => {
      // Safely forward down-stream headers
      if (req.headers["x-user-id"]) {
        proxyReq.setHeader("X-User-Id", req.headers["x-user-id"]);
        proxyReq.setHeader("X-User-Role", req.headers["x-user-role"]);
      }
    },
  }),
);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  logger.info(`⚡ API Core Edge Gateway initialized on port ${PORT}`),
);
