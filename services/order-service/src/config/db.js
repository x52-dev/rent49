const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

// Instantiate Prisma and log query performance if in development
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

const connectPostgres = async () => {
  const maxRetries = parseInt(process.env.DB_MAX_RETRIES, 10) || 5;
  const retryDelay = parseInt(process.env.DB_RETRY_DELAY_MS, 10) || 5000;
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      logger.info(
        `Attempting PostgreSQL connection via Prisma... (Attempt ${attempt}/${maxRetries})`,
      );

      // Explicitly connect to test the connection before accepting HTTP traffic
      await prisma.$connect();

      logger.info(`✅ PostgreSQL Order Database Connected`);
      return;
    } catch (error) {
      logger.error(`❌ PostgreSQL connection failed: ${error.message}`);

      if (attempt === maxRetries) {
        logger.error(
          "🚨 Maximum database connection retries reached. Shutting down service.",
        );
        process.exit(1);
      }

      logger.warn(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      attempt++;
    }
  }
};

module.exports = { prisma, connectPostgres };
