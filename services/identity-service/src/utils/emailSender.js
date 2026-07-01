const nodemailer = require("nodemailer");
const { logger } = require("../config/redis");

// For enterprise production, you would use AWS SES or SendGrid here.
// Ethereal auto-generates a mock inbox URL in the console for local testing.
const sendOtpEmail = async (toEmail, otpCode) => {
  try {
    // Generate a test account on the fly
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Enterprise CRM Admin" <admin@enterprise.com>',
      to: toEmail,
      subject: "Verify Your Account - Security OTP",
      text: `Your verification code is: ${otpCode}. It expires in 15 minutes.`,
      html: `<b>Your verification code is: <span style="font-size: 24px;">${otpCode}</span></b><br>It expires in 15 minutes.`,
    });

    logger.info(`✉️ OTP Email sent to ${toEmail}`);
    logger.info(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}`); // CLICK THIS LINK IN TERMINAL

    return true;
  } catch (error) {
    logger.error(`❌ Email dispatch failure: ${error.message}`);
    return false;
  }
};

module.exports = { sendOtpEmail };
