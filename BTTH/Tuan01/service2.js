const amqp = require("amqplib");
const axios = require("axios");

const QUEUE_NAME = "event_queue";
const RABBITMQ_URL = "amqp://localhost";
const AUTH_SERVER = "http://localhost:3000";

// Verify token với Auth Server
async function verifyToken(token) {
  try {
    const response = await axios.post(
      `${AUTH_SERVER}/verify`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.valid;
  } catch (error) {
    console.error("✗ Token không hợp lệ");
    return false;
  }
}

// Xử lý event nhận được
async function processEvent(message) {
  const event = JSON.parse(message.content.toString());

  console.log("\n--- Event nhận được ---");
  console.log("Type:", event.type);
  console.log("Message:", event.message);
  console.log("Timestamp:", event.timestamp);

  // Verify token
  if (event.token) {
    const isValid = await verifyToken(event.token);
    if (isValid) {
      console.log("✓ Token hợp lệ - Xử lý event");
      console.log("Data:", JSON.stringify(event.data, null, 2));
    } else {
      console.log("✗ Token không hợp lệ - Bỏ qua event");
      return;
    }
  } else {
    console.log("⚠ Không có token - Bỏ qua event");
    return;
  }

  console.log("----------------------\n");
}

// Nhận events từ RabbitMQ
async function consumeEvents() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`✓ Đang lắng nghe queue: ${QUEUE_NAME}`);
    console.log("Đang chờ events...\n");

    // Xử lý từng message một
    channel.prefetch(1);

    channel.consume(QUEUE_NAME, async (message) => {
      if (message !== null) {
        await processEvent(message);
        channel.ack(message); // Xác nhận đã xử lý xong
      }
    });
  } catch (error) {
    console.error("✗ Lỗi:", error.message);
  }
}

// Hàm chính
async function main() {
  console.log("=== SERVICE 2: Event Consumer ===");
  console.log("Kết nối đến RabbitMQ...\n");

  await consumeEvents();
}

// Kiểm tra RabbitMQ
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
