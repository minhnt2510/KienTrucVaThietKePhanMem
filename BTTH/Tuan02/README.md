# TUẦN 02: SCALABILITY, PERFORMANCE & SECURITY

## 📊 1. SCALABILITY

### Các cách Scale:
1. **Horizontal Scaling**: Thêm nhiều server (Nginx, HAProxy, Docker)
2. **Vertical Scaling**: Tăng CPU/RAM
3. **Database Scaling**: Read Replicas, Sharding, Master-Slave
4. **Message Queue Scaling**: Multiple consumers, RabbitMQ Cluster

---

## ⚡ 2. PERFORMANCE

### Các cách tăng Performance:
1. **Redis Cache**: 170ms → 7ms (96% improvement) ⭐
2. **Database Optimization**: Indexing, Query optimization, Connection pooling
3. **Code Optimization**: Promise.all(), Lazy loading, Pagination
4. **Message Queue**: Async processing (email, reports...)

### 🎯 DEMO: Cache 170ms → 7ms
- **Without cache**: DB query (100ms) + Calculation (70ms) = 170ms
- **With cache**: Redis GET = 7ms

---

## 🔒 3. SECURITY

1. **Authentication**: JWT, OAuth 2.0, RBAC
2. **Rate Limiting**: Chống brute force, DDoS
3. **Data Protection**: Encryption, bcrypt/argon2
4. **Security Headers**: Helmet.js, CORS, CSP
5. **Input Validation**: Joi/Yup, prevent injection

---

## 🚀 CHẠY DEMO

```bash
# 1. Cài đặt
npm install

# 2. Start Redis
docker run -d -p 6379:6379 redis:alpine

# 3. Test Performance (3 terminals)
npm run performance:without-cache  # Terminal 1 → ~170ms
npm run performance:with-cache     # Terminal 2 → ~7ms
npm run performance:benchmark      # Terminal 3 → So sánh

# 4. Test Postman
GET http://localhost:3001/api/products/1  # Without cache
GET http://localhost:3002/api/products/1  # With cache

# 5. Bài tập E-commerce
npm run exercise
GET http://localhost:3003/api/products
```

**Kết quả:** 170ms → 7ms (96% faster, 24x speedup) ⚡

Chi tiết: `QUICKSTART.md` | `exercise/POSTMAN_TESTS.md`
