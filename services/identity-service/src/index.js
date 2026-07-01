require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

const {
  signup,
  verifyOtp,
  guestLogin,
  login,
  logout,
} = require("./controllers/authController");

app.post("/auth/signup", signup);
app.post("/auth/verify-email", verifyOtp);
app.post("/auth/guest", guestLogin);
app.post("/auth/login", login);
app.post("/auth/logout", logout);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🔐 Identity Security Hub running on port ${PORT}`),
);
