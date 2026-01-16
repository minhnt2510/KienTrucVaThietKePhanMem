const amqp = require("amqplib");
const axios = require("axios");

const QUEUE_NAME = "event_queue";
const RABBITMQ_URL = "amqp://localhost";
const AUTH_SERVER = "http://localhost:3000";

let accessToken = null;
let refreshToken = null;

// Đăng nhập để lấy tokens
async function login() {
  try {
    const response = await axios.post(`${AUTH_SERVER}/login`, {
      username: "service1",
    });

    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;

    console.log("✓ Đăng nhập thành công");
    return true;
  } catch (error) {
    console.error("✗ Lỗi đăng nhập:", error.message);
    return false;
  }
}

// Verify token
async function verifyToken() {
  try {
    await axios.post(
      `${AUTH_SERVER}/verify`,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return true;
  } catch (error) {
    return false;
  }
}

// Refresh token nếu hết hạn
async function refreshAccessToken() {
  try {
    const response = await axios.post(`${AUTH_SERVER}/token`, {
      refreshToken: refreshToken,
    });

    accessToken = response.data.accessToken;
    console.log("✓ Đã refresh access token");
    return true;
  } catch (error) {
    console.error("✗ Lỗi refresh token:", error.message);
    return false;
  }
}

// Gửi event vào RabbitMQ
async function sendEvent(eventData) {
  try {
    // Kiểm tra token trước khi gửi
    let isValid = await verifyToken();

    if (!isValid) {
      console.log("Token hết hạn, đang refresh...");
      isValid = await refreshAccessToken();

      if (!isValid) {
        console.log("Refresh thất bại, đăng nhập lại...");
        await login();
      }
    }

    // Kết nối RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    const message = {
      ...eventData,
      timestamp: new Date().toISOString(),
      token: accessToken,
    };

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });

    console.log(`✓ Đã gửi event: ${eventData.type} - ${eventData.message}`);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("✗ Lỗi gửi event:", error.message);
  }
}

// Hàm chính
async function main() {
  console.log("=== SERVICE 1: Event Producer ===");
  console.log("Kết nối đến Auth Server...");

  // Đăng nhập
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error("Không thể đăng nhập. Vui lòng kiểm tra Auth Server.");
    return;
  }

  console.log("\nBắt đầu gửi events...\n");

  // Gửi các events mẫu
  let counter = 1;
  setInterval(async () => {
    await sendEvent({
      type: "USER_ACTION",
      message: `Event số ${counter} từ Service 1`,
      data: { eventId: counter, action: "click" },
    });
    counter++;
  }, 5000); // Gửi event mỗi 5 giây
}

// Kiểm tra RabbitMQ có chạy không
async function checkRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    await connection.close();
    return true;
  } catch (error) {
    console.error("✗ Không thể kết nối RabbitMQ:", error.message);
    console.log("\nVui lòng cài đặt và chạy RabbitMQ:");
    console.log("  1. Tải RabbitMQ: https://www.rabbitmq.com/download.html");
    console.log("  2. Hoặc dùng Docker: docker run -d -p 5672:5672 rabbitmq");
    return false;
  }
}

// Chạy service
checkRabbitMQ().then((ok) => {
  if (ok) main();
});
