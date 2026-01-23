const express = require('express');
const Redis = require('ioredis');
const app = express();

app.use(express.json());

// ============================================
// BÀI TẬP: E-COMMERCE ORDER PROCESSING
// ============================================
// Yêu cầu:
// 1. Tạo API xử lý đơn hàng
// 2. Sử dụng Redis cache để tăng performance
// 3. Xử lý các bước: validate, check inventory, calculate price
// 4. Mục tiêu: giảm response time từ 170ms → 7ms
// ============================================

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// ============================================
// MOCK DATA
// ============================================
const PRODUCTS = {
  'PROD-001': { id: 'PROD-001', name: 'Laptop Dell XPS 13', price: 1299.99, stock: 50 },
  'PROD-002': { id: 'PROD-002', name: 'iPhone 15 Pro', price: 999.99, stock: 100 },
  'PROD-003': { id: 'PROD-003', name: 'Samsung Galaxy S24', price: 899.99, stock: 75 },
  'PROD-004': { id: 'PROD-004', name: 'MacBook Pro M3', price: 2499.99, stock: 30 },
  'PROD-005': { id: 'PROD-005', name: 'iPad Air', price: 599.99, stock: 120 }
};

const DISCOUNT_CODES = {
  'SUMMER2024': { code: 'SUMMER2024', discount: 0.15, minOrder: 500 },
  'NEW2024': { code: 'NEW2024', discount: 0.10, minOrder: 300 },
  'VIP': { code: 'VIP', discount: 0.20, minOrder: 1000 }
};

// ============================================
// HELPER FUNCTIONS (Giả lập độ trễ)
// ============================================
function simulateDelay(min, max) {
  return new Promise(resolve => {
    const delay = min + Math.random() * (max - min);
    setTimeout(resolve, delay);
  });
}

// Validate order (30-40ms)
async function validateOrder(orderData) {
  await simulateDelay(30, 40);
  
  const errors = [];
  
  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Order must have at least one item');
  }
  
  if (!orderData.customerEmail) {
    errors.push('Customer email is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Check inventory (50-60ms)
async function checkInventory(items) {
  await simulateDelay(50, 60);
  
  const results = [];
  let allAvailable = true;
  
  for (const item of items) {
    const product = PRODUCTS[item.productId];
    
    if (!product) {
      results.push({
        productId: item.productId,
        available: false,
        reason: 'Product not found'
      });
      allAvailable = false;
    } else if (product.stock < item.quantity) {
      results.push({
        productId: item.productId,
        available: false,
        reason: `Only ${product.stock} in stock`,
        requestedQty: item.quantity,
        availableQty: product.stock
      });
      allAvailable = false;
    } else {
      results.push({
        productId: item.productId,
        available: true,
        product: product
      });
    }
  }
  
  return {
    allAvailable,
    items: results
  };
}

// Calculate price (60-80ms)
async function calculatePrice(items, discountCode = null) {
  await simulateDelay(60, 80);
  
  let subtotal = 0;
  const itemDetails = [];
  
  for (const item of items) {
    const product = PRODUCTS[item.productId];
    if (product) {
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      itemDetails.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }
  }
  
  // Apply discount
  let discount = 0;
  let discountApplied = false;
  
  if (discountCode && DISCOUNT_CODES[discountCode]) {
    const coupon = DISCOUNT_CODES[discountCode];
    if (subtotal >= coupon.minOrder) {
      discount = subtotal * coupon.discount;
      discountApplied = true;
    }
  }
  
  // Calculate tax and shipping
  const tax = (subtotal - discount) * 0.08; // 8% tax
  const shipping = subtotal > 500 ? 0 : 15.99; // Free shipping over $500
  const total = subtotal - discount + tax + shipping;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    discountApplied,
    tax: parseFloat(tax.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    items: itemDetails
  };
}

// ============================================
// API ENDPOINTS
// ============================================

// GET /api/products - Lấy danh sách sản phẩm (WITH CACHE)
app.get('/api/products', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const cacheKey = 'products:all';
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      const processingTime = Date.now() - startTime;
      return res.json({
        success: true,
        data: JSON.parse(cached),
        meta: {
          processingTime: `${processingTime}ms`,
          cached: true
        }
      });
    }
    
    // Simulate DB query
    await simulateDelay(80, 100);
    
    const products = Object.values(PRODUCTS);
    
    // Save to cache (TTL: 10 minutes)
    await redis.setex(cacheKey, 600, JSON.stringify(products));
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: products,
      meta: {
        processingTime: `${processingTime}ms`,
        cached: false
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/products/:id - Lấy chi tiết sản phẩm (WITH CACHE)
app.get('/api/products/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const productId = req.params.id;
    const cacheKey = `product:${productId}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      const processingTime = Date.now() - startTime;
      return res.json({
        success: true,
        data: JSON.parse(cached),
        meta: {
          processingTime: `${processingTime}ms`,
          cached: true
        }
      });
    }
    
    // Simulate DB query
    await simulateDelay(70, 90);
    
    const product = PRODUCTS[productId];
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Save to cache
    await redis.setex(cacheKey, 600, JSON.stringify(product));
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: product,
      meta: {
        processingTime: `${processingTime}ms`,
        cached: false
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/orders/validate - Validate và tính giá đơn hàng
app.post('/api/orders/validate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const orderData = req.body;
    
    // Step 1: Validate order
    const validation = await validateOrder(orderData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }
    
    // Step 2: Check inventory
    const inventory = await checkInventory(orderData.items);
    if (!inventory.allAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Some items are not available',
        details: inventory.items.filter(i => !i.available)
      });
    }
    
    // Step 3: Calculate price
    const pricing = await calculatePrice(orderData.items, orderData.discountCode);
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        valid: true,
        inventory: 'available',
        pricing: pricing
      },
      meta: {
        processingTime: `${processingTime}ms`,
        steps: {
          validation: '~35ms',
          inventory: '~55ms',
          pricing: '~70ms'
        }
      }
    });
    
    console.log(`📦 Order validated in ${processingTime}ms`);
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/orders - Tạo đơn hàng (WITH CACHE for price calculation)
app.post('/api/orders', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const orderData = req.body;
    
    // Generate cache key based on items and discount
    const cacheKey = `order:calc:${JSON.stringify(orderData.items)}:${orderData.discountCode || 'none'}`;
    
    // Check if we have cached calculation
    const cachedCalc = await redis.get(cacheKey);
    
    let pricing;
    let usedCache = false;
    
    if (cachedCalc) {
      pricing = JSON.parse(cachedCalc);
      usedCache = true;
      console.log('⚡ Using cached price calculation');
    } else {
      // Perform all steps
      const validation = await validateOrder(orderData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors
        });
      }
      
      const inventory = await checkInventory(orderData.items);
      if (!inventory.allAvailable) {
        return res.status(400).json({
          success: false,
          error: 'Some items are not available',
          details: inventory.items
        });
      }
      
      pricing = await calculatePrice(orderData.items, orderData.discountCode);
      
      // Cache the calculation (TTL: 5 minutes)
      await redis.setex(cacheKey, 300, JSON.stringify(pricing));
    }
    
    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        orderId: orderId,
        status: 'pending',
        customerEmail: orderData.customerEmail,
        pricing: pricing,
        createdAt: new Date().toISOString()
      },
      meta: {
        processingTime: `${processingTime}ms`,
        cached: usedCache
      }
    });
    
    console.log(`✅ Order ${orderId} created in ${processingTime}ms (cache: ${usedCache})`);
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discount-codes - Lấy danh sách mã giảm giá
app.get('/api/discount-codes', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const cacheKey = 'discount:codes';
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      const processingTime = Date.now() - startTime;
      return res.json({
        success: true,
        data: JSON.parse(cached),
        meta: {
          processingTime: `${processingTime}ms`,
          cached: true
        }
      });
    }
    
    await simulateDelay(40, 60);
    
    const codes = Object.values(DISCOUNT_CODES);
    await redis.setex(cacheKey, 3600, JSON.stringify(codes));
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: codes,
      meta: {
        processingTime: `${processingTime}ms`,
        cached: false
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/cache/clear - Clear cache
app.delete('/api/cache/clear', async (req, res) => {
  try {
    await redis.flushall();
    res.json({ success: true, message: 'Cache cleared' });
    console.log('🗑️  Cache cleared');
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({
      status: 'ok',
      redis: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      redis: 'disconnected'
    });
  }
});

// ============================================
// START SERVER
// ============================================
const PORT = 3003;
app.listen(PORT, () => {
  console.log('🚀 E-commerce Order API running on port', PORT);
  console.log('📝 Endpoints:');
  console.log('   GET  /api/products');
  console.log('   GET  /api/products/:id');
  console.log('   POST /api/orders/validate');
  console.log('   POST /api/orders');
  console.log('   GET  /api/discount-codes');
  console.log('   DELETE /api/cache/clear');
  console.log('\n💡 Test với Postman:');
  console.log('   http://localhost:3003/api/products');
});

module.exports = app;
