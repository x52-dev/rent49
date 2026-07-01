const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const TokenService = require("../services/tokenService");
const { sendOtpEmail } = require("../utils/emailSender");
const { logger } = require("../config/redis");

const prisma = new PrismaClient();

// 1. SIGNUP: Initiate the account creation and OTP generation
const signup = async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ error: "Cryptographic mismatch: Passwords do not match" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Identity collision: Email already in use" });
    }

    const salt = await bcrypt.genSalt(12); // Enterprise standard cost factor
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate a cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins from now

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "BUYER",
        otpCode,
        otpExpiresAt,
      },
    });

    // Dispatch email asynchronously so it doesn't block the HTTP response
    sendOtpEmail(email, otpCode);

    logger.info(
      `Identity initialized for ${email}. Awaiting OTP verification.`,
    );
    return res.status(201).json({
      success: true,
      message: "Account created. Please check your email for the OTP.",
    });
  } catch (error) {
    logger.error(`Signup pipeline fault: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Internal system error during provisioning" });
  }
};

// 2. VERIFY OTP: Validate the code and issue the JWT tokens
const verifyOtp = async (req, res) => {
  const { email, otpCode } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: "Identity not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: "Identity already verified" });
    }
    if (user.otpCode !== otpCode || new Date() > user.otpExpiresAt) {
      return res.status(401).json({ error: "OTP is invalid or expired" });
    }

    // Mark as verified and sanitize the OTP fields
    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null },
    });

    // Issue Enterprise Hybrid Tokens
    const accessToken = TokenService.generateAccessToken(verifiedUser);
    const refreshToken = TokenService.generateOpaqueRefreshToken();
    await TokenService.saveRefreshToken(verifiedUser.id, refreshToken);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    logger.info(`✅ Identity verified and sessions established for ${email}`);
    return res
      .status(200)
      .json({ success: true, accessToken, userId: verifiedUser.id });
  } catch (error) {
    logger.error(`Verification pipeline fault: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Internal system error during verification" });
  }
};

// 3. GUEST LOGIN: Stateless ephemeral access
const guestLogin = async (req, res) => {
  try {
    // Generate an ephemeral guest ID without saving to Postgres
    const guestUser = { id: `guest_${crypto.randomUUID()}`, role: "GUEST" };

    // We only issue a short-lived access token for guests. No Refresh token needed.
    const accessToken = TokenService.generateAccessToken(guestUser);

    logger.info(`Ephemeral Guest session initialized: ${guestUser.id}`);
    return res.status(200).json({ success: true, accessToken, role: "GUEST" });
  } catch (error) {
    logger.error(`Guest initialization fault: ${error.message}`);
    return res.status(500).json({ error: "Internal system error" });
  }
};

module.exports = { signup, verifyOtp, guestLogin }; // Ensure you also export standard login/logout from previous steps
