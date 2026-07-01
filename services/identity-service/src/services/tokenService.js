const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { redisClient, logger } = require("../config/redis");

class TokenService {
  static generateAccessToken(user) {
    return jwt.sign(
      { userId: user.id, role: user.role || "USER" },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRATION },
    );
  }

  static generateOpaqueRefreshToken() {
    return crypto.randomBytes(40).toString("hex");
  }

  static async saveRefreshToken(userId, refreshToken) {
    const ttl =
      parseInt(process.env.JWT_REFRESH_EXPIRATION_SECONDS, 10) || 2592000;
    const redisKey = `session:${userId}:${refreshToken}`;

    try {
      // Store stateful session metadata in Redis
      await redisClient.set(
        redisKey,
        JSON.stringify({ active: true, deviceFingerprint: "mocked_device" }),
        "EX",
        ttl,
      );
      logger.info(`Session entry registered in cache for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to commit session state to Redis: ${error.message}`);
      throw new Error("Internal state tracking exception");
    }
  }

  static async verifyAndRevokeSession(userId, refreshToken) {
    const redisKey = `session:${userId}:${refreshToken}`;
    try {
      const session = await redisClient.get(redisKey);
      if (!session) return false;

      await redisClient.del(redisKey);
      logger.info(`Session successfully evicted from Redis cluster: ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Session eviction tracking failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = TokenService;
