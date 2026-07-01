const Redis = require("ioredis");
const winston = require("winston");

// Central logger configuration for identity context
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: "identity-service-redis" },
  transports: [new winston.transports.Console()],
});

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection lost. Retrying execution in ${delay}ms...`);
    return delay;
  },
});

redisClient.on("connect", () =>
  logger.info("✅ Distributed Redis Cache Sync Active"),
);
redisClient.on("error", (err) =>
  logger.error(`❌ Redis operational anomaly: ${err.message}`),
);

module.exports = { redisClient, logger };
