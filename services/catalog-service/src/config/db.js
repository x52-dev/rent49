const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  const maxRetries = parseInt(process.env.DB_MAX_RETRIES, 10) || 5;
  const retryDelay = parseInt(process.env.DB_RETRY_DELAY_MS, 10) || 5000;
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      logger.info(
        `Attempting MongoDB connection... (Attempt ${attempt}/${maxRetries})`,
      );

      const conn = await mongoose.connect(process.env.MONGO_URI);

      logger.info(`✅ MongoDB Catalog Connected: ${conn.connection.host}`);
      return; // Exit the loop on success
    } catch (error) {
      logger.error(`❌ MongoDB connection failed: ${error.message}`);

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

module.exports = connectDB;
