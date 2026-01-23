const express = require('express');
const app = express();

app.use(express.json());

// ============================================
// GIẢI THÍCH: API KHÔNG CÓ CACHE
// ============================================
// Mỗi request sẽ:
// 1. Truy vấn "database" (giả lập bằng delay)
// 2. Tính toán phức tạp
// 3. Trả về kết quả
// 
// Kết quả: ~170ms/request
// ============================================

// Giả lập database query (tốn thời gian)
function simulateDatabaseQuery(productId) {
  return new Promise((resolve) => {
    // Giả lập độ trễ database: 100-120ms
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

// Giả lập tính toán phức tạp (discount, tax, shipping)
function calculatePriceDetails(basePrice) {
  return new Promise((resolve) => {
    // Giả lập độ trễ tính toán: 50-70ms
    const delay = 50 + Math.random() * 20;
    setTimeout(() => {
      const discount = basePrice * 0.1; // 10% discount
      const tax = basePrice * 0.08; // 8% tax
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
// API ENDPOINT - WITHOUT CACHE
// ============================================
app.get('/api/products/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const productId = req.params.id;
    
    // Bước 1: Query database (100-120ms)
    const product = await simulateDatabaseQuery(productId);
    
    // Bước 2: Tính toán giá (50-70ms)
    const priceDetails = await calculatePriceDetails(product.price);
    
    // Tổng thời gian: ~150-190ms
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        ...product,
        pricing: priceDetails
      },
      meta: {
        processingTime: `${processingTime}ms`,
        cached: false,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log(`⏱️  Request processed in ${processingTime}ms (NO CACHE)`);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    cache: 'disabled',
    service: 'api-without-cache'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log('🚀 API WITHOUT CACHE running on port', PORT);
  console.log('📊 Expected performance: ~170ms per request');
  console.log('🔗 Test: http://localhost:3001/api/products/1');
});

module.exports = app;
