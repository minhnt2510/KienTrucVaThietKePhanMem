const express = require('express');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3001;
const INSTANCE_ID = process.env.INSTANCE_ID || '1';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';

// Redis client
const redis = new Redis({
  host: REDIS_HOST,
  port: 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log(`✓ Redis connected (Instance ${INSTANCE_ID})`);
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

// Middleware to track instance
app.use((req, res, next) => {
  res.setHeader('X-Instance-ID', INSTANCE_ID);
  res.setHeader('X-Server-Time', new Date().toISOString());
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    instance: INSTANCE_ID,
    timestamp: new Date().toISOString()
  });
});

// Simulate product database
const products = [
  { id: 1, name: 'Laptop Dell XPS 13', price: 1200, stock: 50, category: 'Electronics' },
  { id: 2, name: 'iPhone 15 Pro', price: 999, stock: 100, category: 'Electronics' },
  { id: 3, name: 'Samsung TV 55"', price: 800, stock: 30, category: 'Electronics' },
  { id: 4, name: 'Sony Headphones', price: 299, stock: 200, category: 'Audio' },
  { id: 5, name: 'Nike Air Max', price: 150, stock: 150, category: 'Fashion' }
];

// API: Get product with cache
app.get('/api/products/:id', async (req, res) => {
  const startTime = Date.now();
  const productId = parseInt(req.params.id);

  try {
    // Try cache first
    const cacheKey = `product:${productId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const responseTime = Date.now() - startTime;
      return res.json({
        data: JSON.parse(cached),
        cached: true,
        instance: INSTANCE_ID,
        responseTime: `${responseTime}ms`
      });
    }

    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(product));

    const responseTime = Date.now() - startTime;
    res.json({
      data: product,
      cached: false,
      instance: INSTANCE_ID,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get all products
app.get('/api/products', async (req, res) => {
  const startTime = Date.now();
  const { category } = req.query;

  try {
    const cacheKey = category ? `products:category:${category}` : 'products:all';
    const cached = await redis.get(cacheKey);

    if (cached) {
      const responseTime = Date.now() - startTime;
      return res.json({
        data: JSON.parse(cached),
        cached: true,
        instance: INSTANCE_ID,
        responseTime: `${responseTime}ms`,
        count: JSON.parse(cached).length
      });
    }

    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 150));

    let result = products;
    if (category) {
      result = products.filter(p => p.category === category);
    }

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result));

    const responseTime = Date.now() - startTime;
    res.json({
      data: result,
      cached: false,
      instance: INSTANCE_ID,
      responseTime: `${responseTime}ms`,
      count: result.length
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Create order (heavy operation)
app.post('/api/orders', async (req, res) => {
  const startTime = Date.now();
  const { productId, quantity, userId } = req.body;

  try {
    // Validate
    if (!productId || !quantity || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check product
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Simulate processing time (validation, payment, etc.)
    await new Promise(resolve => setTimeout(resolve, 200));

    // Calculate total
    const total = product.price * quantity;
    const tax = total * 0.1;
    const grandTotal = total + tax;

    const order = {
      orderId: `ORD-${Date.now()}-${INSTANCE_ID}`,
      userId,
      product: product.name,
      quantity,
      total,
      tax,
      grandTotal,
      status: 'pending',
      createdAt: new Date().toISOString(),
      processedBy: `Instance ${INSTANCE_ID}`
    };

    // Cache recent order
    await redis.setex(`order:${order.orderId}`, 600, JSON.stringify(order));

    const responseTime = Date.now() - startTime;
    res.status(201).json({
      data: order,
      instance: INSTANCE_ID,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get cache stats
app.get('/api/stats/cache', async (req, res) => {
  try {
    const info = await redis.info('stats');
    const keys = await redis.keys('*');
    
    res.json({
      instance: INSTANCE_ID,
      totalKeys: keys.length,
      keys: keys,
      info: info
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Clear cache
app.delete('/api/cache', async (req, res) => {
  try {
    await redis.flushdb();
    res.json({
      message: 'Cache cleared',
      instance: INSTANCE_ID
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🚀 API Server (Instance ${INSTANCE_ID}) - SCALABILITY DEMO     
╚════════════════════════════════════════════════════════════════╝

📍 Server: http://localhost:${PORT}
🔄 Instance ID: ${INSTANCE_ID}
💾 Redis: ${REDIS_HOST}:6379

📡 Endpoints:
   GET    /health                    - Health check
   GET    /api/products              - Get all products
   GET    /api/products/:id          - Get product by ID
   POST   /api/orders                - Create order
   GET    /api/stats/cache           - Cache statistics
   DELETE /api/cache                 - Clear cache

✓ Server ready to handle requests!
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});
