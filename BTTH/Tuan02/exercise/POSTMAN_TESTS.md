# 📋 POSTMAN COLLECTION - Tuan02 APIs

## Setup

### 1. Import Collection
Copy các request dưới đây vào Postman

### 2. Environment Variables (Optional)
```
BASE_URL_WITHOUT_CACHE = http://localhost:3001
BASE_URL_WITH_CACHE = http://localhost:3002
BASE_URL_EXERCISE = http://localhost:3003
```

---

## 📊 PERFORMANCE TEST

### 1. API WITHOUT Cache - Get Product
```
GET http://localhost:3001/api/products/1
```

**Expected:** ~170ms mỗi lần

---

### 2. API WITH Cache - Get Product (First Time)
```
GET http://localhost:3002/api/products/1
```

**Expected:**
- Lần 1: ~170ms (cache miss)
- Lần 2+: ~7ms (cache hit) ⚡

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Product 1",
    "price": 99.99,
    "pricing": {
      "basePrice": 99.99,
      "discount": 9.999,
      "tax": 8.0,
      "shipping": 5.99,
      "finalPrice": 103.98
    }
  },
  "meta": {
    "processingTime": "7ms",
    "cached": true,
    "cacheHit": true
  }
}
```

---

### 3. Clear Cache (WITH Cache API)
```
DELETE http://localhost:3002/api/cache/clear
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

## 🛒 E-COMMERCE EXERCISE

### 1. Get All Products
```
GET http://localhost:3003/api/products
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "PROD-001",
      "name": "Laptop Dell XPS 13",
      "price": 1299.99,
      "stock": 50
    },
    ...
  ],
  "meta": {
    "processingTime": "7ms",
    "cached": true
  }
}
```

---

### 2. Get Product by ID
```
GET http://localhost:3003/api/products/PROD-001
```

---

### 3. Get Discount Codes
```
GET http://localhost:3003/api/discount-codes
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "SUMMER2024",
      "discount": 0.15,
      "minOrder": 500
    },
    {
      "code": "NEW2024",
      "discount": 0.1,
      "minOrder": 300
    }
  ]
}
```

---

### 4. Validate Order
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

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "inventory": "available",
    "pricing": {
      "subtotal": 3299.97,
      "discount": 494.99,
      "discountApplied": true,
      "tax": 224.40,
      "shipping": 0,
      "total": 3029.38,
      "items": [...]
    }
  },
  "meta": {
    "processingTime": "162ms"
  }
}
```

---

### 5. Create Order (First Time - NO Cache)
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

**Expected:** ~160ms (full processing)

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-1234567890-abc123",
    "status": "pending",
    "customerEmail": "customer@example.com",
    "pricing": {
      "subtotal": 1299.99,
      "discount": 129.99,
      "tax": 93.60,
      "shipping": 0,
      "total": 1263.60
    },
    "createdAt": "2024-01-23T10:30:00.000Z"
  },
  "meta": {
    "processingTime": "158ms",
    "cached": false
  }
}
```

---

### 6. Create Same Order (WITH Cache)
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

**Expected:** ~10ms (cached calculation) ⚡

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-1234567891-def456",
    ...
  },
  "meta": {
    "processingTime": "9ms",
    "cached": true
  }
}
```

---

### 7. Test với nhiều sản phẩm
```
POST http://localhost:3003/api/orders
Content-Type: application/json

{
  "customerEmail": "vip@example.com",
  "items": [
    {
      "productId": "PROD-001",
      "quantity": 1
    },
    {
      "productId": "PROD-004",
      "quantity": 1
    }
  ],
  "discountCode": "VIP"
}
```

**Subtotal:** $3,799.98  
**Discount (20%):** $759.99  
**Tax:** $243.19  
**Shipping:** Free  
**Total:** $3,283.18  

---

### 8. Test Invalid Order (Out of Stock)
```
POST http://localhost:3003/api/orders
Content-Type: application/json

{
  "customerEmail": "customer@example.com",
  "items": [
    {
      "productId": "PROD-001",
      "quantity": 1000
    }
  ]
}
```

**Response:**
```json
{
  "success": false,
  "error": "Some items are not available",
  "details": [
    {
      "productId": "PROD-001",
      "available": false,
      "reason": "Only 50 in stock",
      "requestedQty": 1000,
      "availableQty": 50
    }
  ]
}
```

---

### 9. Clear All Cache
```
DELETE http://localhost:3003/api/cache/clear
```

---

## 🎯 Testing Workflow

### Test Performance Improvement (170ms → 7ms)

1. **Start Redis:**
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Clear cache:**
   ```
   DELETE http://localhost:3002/api/cache/clear
   ```

3. **First request (Cache MISS):**
   ```
   GET http://localhost:3002/api/products/1
   ```
   → Note the time: ~170ms

4. **Second request (Cache HIT):**
   ```
   GET http://localhost:3002/api/products/1
   ```
   → Note the time: ~7ms ⚡

5. **Compare:**
   - Improvement: **~96%**
   - Speedup: **~24x**

---

## 📈 Expected Results

| Test Case | First Request | Subsequent Requests | Improvement |
|-----------|--------------|-------------------|-------------|
| Get Product (with cache) | 170ms | 7ms | 96% |
| Get Products List | 90ms | 6ms | 93% |
| Create Order (same items) | 160ms | 10ms | 94% |
| Get Discount Codes | 50ms | 5ms | 90% |

---

## 💡 Tips

1. **Xem response time** trong Postman tab "Test Results"
2. **So sánh** giữa cached và không cached
3. **Test nhiều lần** để thấy rõ sự khác biệt
4. **Clear cache** giữa các test để đảm bảo chính xác
