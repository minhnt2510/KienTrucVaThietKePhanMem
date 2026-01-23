# 🛒 BÀI TẬP: E-COMMERCE ORDER PROCESSING API

## Mô tả
API xử lý đơn hàng e-commerce với Redis cache để tối ưu performance.

## Chức năng

### 1. Quản lý sản phẩm
- **GET /api/products** - Danh sách sản phẩm (cached)
- **GET /api/products/:id** - Chi tiết sản phẩm (cached)

### 2. Xử lý đơn hàng
- **POST /api/orders/validate** - Validate đơn hàng
- **POST /api/orders** - Tạo đơn hàng mới (với cache)

### 3. Mã giảm giá
- **GET /api/discount-codes** - Danh sách mã giảm giá (cached)

## Cách chạy

### 1. Start Redis
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 2. Chạy API
```bash
node exercise/ecommerce-order-api.js
```

Hoặc thêm vào package.json:
```bash
npm run exercise
```

## Test với Postman

### 1. Lấy danh sách sản phẩm
```
GET http://localhost:3003/api/products
```

**Lần 1:** ~90ms (cache miss)  
**Lần 2:** ~7ms (cache hit) ⚡

### 2. Xem chi tiết sản phẩm
```
GET http://localhost:3003/api/products/PROD-001
```

### 3. Validate đơn hàng
```
POST http://localhost:3003/api/orders/validate
Content-Type: application/json

{
  "customerEmail": "customer@example.com",
  "items": [
    {
      "productId": "PROD-001",
      "quantity": 1
    },
    {
      "productId": "PROD-002",
      "quantity": 2
    }
  ],
  "discountCode": "SUMMER2024"
}
```

**Response time:** ~160ms (validation + inventory + calculation)

### 4. Tạo đơn hàng
```
POST http://localhost:3003/api/orders
Content-Type: application/json

{
  "customerEmail": "customer@example.com",
  "items": [
    {
      "productId": "PROD-001",
      "quantity": 1
    }
  ],
  "discountCode": "NEW2024"
}
```

**Lần 1:** ~160ms (full processing)  
**Lần 2 (cùng items):** ~10ms (cached calculation) ⚡

### 5. Xem mã giảm giá
```
GET http://localhost:3003/api/discount-codes
```

### 6. Clear cache (để test lại)
```
DELETE http://localhost:3003/api/cache/clear
```

## Kết quả Performance

| Endpoint | Without Cache | With Cache | Improvement |
|----------|--------------|------------|-------------|
| GET /products | ~90ms | ~7ms | **92%** |
| GET /products/:id | ~80ms | ~6ms | **92.5%** |
| POST /orders | ~160ms | ~10ms | **93.75%** |
| GET /discount-codes | ~50ms | ~5ms | **90%** |

## Mock Data

### Products
- PROD-001: Laptop Dell XPS 13 ($1,299.99)
- PROD-002: iPhone 15 Pro ($999.99)
- PROD-003: Samsung Galaxy S24 ($899.99)
- PROD-004: MacBook Pro M3 ($2,499.99)
- PROD-005: iPad Air ($599.99)

### Discount Codes
- **SUMMER2024**: 15% off (min $500)
- **NEW2024**: 10% off (min $300)
- **VIP**: 20% off (min $1,000)

## Pricing Logic

1. **Subtotal** = Σ (price × quantity)
2. **Discount** = subtotal × discount% (if eligible)
3. **Tax** = (subtotal - discount) × 8%
4. **Shipping** = $15.99 (free if subtotal > $500)
5. **Total** = subtotal - discount + tax + shipping

## Bài tập mở rộng

1. **Rate Limiting**: Giới hạn số request/phút
2. **JWT Auth**: Yêu cầu đăng nhập để tạo order
3. **RabbitMQ**: Gửi order vào queue để xử lý async
4. **Database**: Lưu orders vào MongoDB
5. **Webhook**: Gửi notification khi order thành công
