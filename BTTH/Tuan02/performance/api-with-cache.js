const express = require('express');
const Redis = require('ioredis');
const app = express();

app.use(express.json());

// ============================================
// GIẢI THÍCH: API CÓ REDIS CACHE
// ============================================
// Luồng xử lý:
// 1. Check Redis cache trước (< 5ms)
// 2. Nếu có cache → trả về ngay (FAST!)
// 3. Nếu không có → query DB + tính toán + lưu cache
// 
// Kết quả:
// - Cache HIT: ~7ms
// - Cache MISS: ~170ms (lần đầu)
// ============================================

// Khởi tạo Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

// Giả lập database query
function simulateDatabaseQuery(productId) {
  return new Promise((resolve) => {
    const delay = 100 + Math.random() * 20;
    setTimeout(() => {
      resolve({
        id: productId,
        name: `Product ${productId}`,
        price: 99.99,
        description: 'This is a sample product',
        category: 'Electronics',
        inStock: true,
        reviews: 145,
        rating: 4.5
      });
    }, delay);
  });
}

// Giả lập tính toán phức tạp
function calculatePriceDetails(basePrice) {
  return new Promise((resolve) => {
    const delay = 50 + Math.random() * 20;
    setTimeout(() => {
      const discount = basePrice * 0.1;
      const tax = basePrice * 0.08;
      const shipping = 5.99;
      const finalPrice = basePrice - discount + tax + shipping;
      
      resolve({
        basePrice,
        discount,
        tax,
        shipping,
        finalPrice: parseFloat(finalPrice.toFixed(2))
      });
    }, delay);
  });
}

// ============================================
// API ENDPOINT - WITH REDIS CACHE
// ============================================
app.get('/api/products/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const productId = req.params.id;
    const cacheKey = `product:${productId}`;
    
    // =====================================
    // BƯỚC 1: CHECK CACHE (< 5ms)
    // =====================================
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      // CACHE HIT - Trả về ngay lập tức!
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: JSON.parse(cachedData),
        meta: {
          processingTime: `${processingTime}ms`,
          cached: true,
          cacheHit: true,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`⚡ CACHE HIT! Request in ${processingTime}ms`);
      return;
    }
    
    // =====================================
    // BƯỚC 2: CACHE MISS - Query DB
    // =====================================
    console.log('💾 Cache miss, querying database...');
    
    const product = await simulateDatabaseQuery(productId);
    const priceDetails = await calculatePriceDetails(product.price);
    
    const responseData = {
      ...product,
      pricing: priceDetails
    };
    
    // =====================================
    // BƯỚC 3: LƯU VÀO CACHE (TTL: 5 phút)
    // =====================================
    await redis.setex(cacheKey, 300, JSON.stringify(responseData));
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: responseData,
      meta: {
        processingTime: `${processingTime}ms`,
        cached: false,
        cacheHit: false,
        cacheSaved: true,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`🐌 Cache miss. Request in ${processingTime}ms (saved to cache)`);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache endpoint (để test lại)
app.delete('/api/cache/clear', async (req, res) => {
  try {
    await redis.flushall();
    res.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    });
    console.log('🗑️  Cache cleared');
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({ 
      status: 'ok',
      cache: 'enabled',
      redis: 'connected',
      service: 'api-with-cache'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      cache: 'disabled',
      redis: 'disconnected'
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log('🚀 API WITH CACHE running on port', PORT);
  console.log('📊 Expected performance:');
  console.log('   - Cache HIT: ~7ms');
  console.log('   - Cache MISS: ~170ms (first request only)');
  console.log('🔗 Test: http://localhost:3002/api/products/1');
  console.log('🗑️  Clear cache: DELETE http://localhost:3002/api/cache/clear');
});

module.exports = app;
