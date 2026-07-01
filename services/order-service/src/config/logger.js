const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // Automatically log error stack traces
    winston.format.json(), // Enterprise standard for log aggregation
  ),
  defaultMeta: { service: "order-service" },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "development"
          ? winston.format.simple()
          : winston.format.json(),
    }),
  ],
});

module.exports = logger;
