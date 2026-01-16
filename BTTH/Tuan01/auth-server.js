const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// Secret keys (trong thực tế nên dùng biến môi trường)
const ACCESS_TOKEN_SECRET = "access-secret-key-12345";
const REFRESH_TOKEN_SECRET = "refresh-secret-key-67890";

// Lưu refresh tokens (trong thực tế nên dùng database)
let refreshTokens = [];

// Tạo access token
function generateAccessToken(user) {
  return jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
}

// Tạo refresh token
function generateRefreshToken(user) {
  return jwt.sign(user, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
}

// Endpoint để đăng nhập và lấy tokens
app.post("/login", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const user = { username: username };

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  refreshTokens.push(refreshToken);

  res.json({
    accessToken,
    refreshToken,
    message: "Login successful",
  });
});

// Endpoint để refresh access token
app.post("/token", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const accessToken = generateAccessToken({ username: user.username });
    res.json({ accessToken });
  });
});

// Endpoint để verify access token
app.post("/verify", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    res.json({ valid: true, user });
  });
});

// Endpoint để logout
app.post("/logout", (req, res) => {
  const { refreshToken } = req.body;
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  res.json({ message: "Logged out successfully" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`OAuth Server đang chạy tại http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  POST /login - Đăng nhập và lấy tokens");
  console.log("  POST /token - Refresh access token");
  console.log("  POST /verify - Kiểm tra token hợp lệ");
  console.log("  POST /logout - Đăng xuất");
});
