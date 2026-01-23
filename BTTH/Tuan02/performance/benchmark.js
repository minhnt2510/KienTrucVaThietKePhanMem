const axios = require('axios');

// ============================================
// BENCHMARK TOOL
// So sánh performance: WITH vs WITHOUT cache
// ============================================

const API_WITHOUT_CACHE = 'http://localhost:3001';
const API_WITH_CACHE = 'http://localhost:3002';
const PRODUCT_ID = 1;
const NUM_REQUESTS = 10;

// Màu sắc cho console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testAPI(url, apiName, numRequests) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${colors.cyan}📊 Testing: ${apiName}${colors.reset}`);
  console.log(`${'='.repeat(50)}`);
  
  const times = [];
  
  for (let i = 1; i <= numRequests; i++) {
    try {
      const start = Date.now();
      const response = await axios.get(`${url}/api/products/${PRODUCT_ID}`);
      const duration = Date.now() - start;
      
      times.push(duration);
      
      const isCached = response.data.meta?.cached || false;
      const cacheStatus = isCached ? '⚡ CACHED' : '💾 NOT CACHED';
      const color = isCached ? colors.green : colors.yellow;
      
      console.log(
        `${color}Request ${i}/${numRequests}: ${duration}ms ${cacheStatus}${colors.reset}`
      );
      
      // Delay nhỏ giữa các request
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`${colors.red}❌ Error on request ${i}: ${error.message}${colors.reset}`);
    }
  }
  
  return times;
}

function calculateStats(times) {
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return { avg, min, max, total: sum };
}

function printStats(times, label) {
  const stats = calculateStats(times);
  
  console.log(`\n${colors.blue}📈 ${label} Statistics:${colors.reset}`);
  console.log(`   Average: ${stats.avg.toFixed(2)}ms`);
  console.log(`   Min: ${stats.min}ms`);
  console.log(`   Max: ${stats.max}ms`);
  console.log(`   Total: ${stats.total}ms`);
  
  return stats;
}

function printComparison(stats1, stats2) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${colors.green}🏆 COMPARISON RESULTS${colors.reset}`);
  console.log(`${'='.repeat(50)}`);
  
  const improvement = ((stats1.avg - stats2.avg) / stats1.avg * 100).toFixed(2);
  const speedup = (stats1.avg / stats2.avg).toFixed(2);
  
  console.log(`\n${colors.yellow}Performance Improvement:${colors.reset}`);
  console.log(`   Without Cache: ${stats1.avg.toFixed(2)}ms`);
  console.log(`   With Cache: ${stats2.avg.toFixed(2)}ms`);
  console.log(`   ${colors.green}✨ Improvement: ${improvement}% faster${colors.reset}`);
  console.log(`   ${colors.green}⚡ Speedup: ${speedup}x${colors.reset}`);
  
  if (stats2.avg <= 10) {
    console.log(`\n${colors.green}✅ TARGET ACHIEVED: Response time ≤ 10ms!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Target: Reduce to ≤ 10ms${colors.reset}`);
  }
}

async function clearCache() {
  try {
    await axios.delete(`${API_WITH_CACHE}/api/cache/clear`);
    console.log(`${colors.cyan}🗑️  Cache cleared${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Could not clear cache: ${error.message}${colors.reset}`);
  }
}

async function checkServices() {
  console.log(`${colors.cyan}🔍 Checking services...${colors.reset}`);
  
  const checks = [
    { url: `${API_WITHOUT_CACHE}/health`, name: 'API Without Cache (Port 3001)' },
    { url: `${API_WITH_CACHE}/health`, name: 'API With Cache (Port 3002)' }
  ];
  
  for (const check of checks) {
    try {
      await axios.get(check.url);
      console.log(`${colors.green}✅ ${check.name} is running${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ ${check.name} is NOT running${colors.reset}`);
      console.log(`${colors.yellow}   Start it with: npm run ${check.name.includes('Without') ? 'performance:without-cache' : 'performance:with-cache'}${colors.reset}`);
      return false;
    }
  }
  
  return true;
}

async function runBenchmark() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════╗
║       PERFORMANCE BENCHMARK TOOL                  ║
║       Testing: WITHOUT vs WITH Redis Cache        ║
╚═══════════════════════════════════════════════════╝
${colors.reset}`);
  
  // Check if services are running
  const servicesReady = await checkServices();
  if (!servicesReady) {
    console.log(`\n${colors.red}❌ Please start both services first!${colors.reset}\n`);
    process.exit(1);
  }
  
  console.log(`\n${colors.cyan}📝 Test Configuration:${colors.reset}`);
  console.log(`   Number of requests: ${NUM_REQUESTS}`);
  console.log(`   Product ID: ${PRODUCT_ID}`);
  
  // Clear cache before starting
  await clearCache();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test WITHOUT cache
  const timesWithoutCache = await testAPI(
    API_WITHOUT_CACHE, 
    'API WITHOUT CACHE',
    NUM_REQUESTS
  );
  
  const statsWithoutCache = printStats(timesWithoutCache, 'WITHOUT CACHE');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clear cache again
  await clearCache();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test WITH cache
  const timesWithCache = await testAPI(
    API_WITH_CACHE,
    'API WITH CACHE',
    NUM_REQUESTS
  );
  
  const statsWithCache = printStats(timesWithCache, 'WITH CACHE');
  
  // Print comparison
  printComparison(statsWithoutCache, statsWithCache);
  
  console.log(`\n${colors.cyan}✨ Benchmark completed!${colors.reset}\n`);
}

// Run benchmark
runBenchmark().catch(error => {
  console.error(`${colors.red}❌ Benchmark failed:${colors.reset}`, error.message);
  process.exit(1);
});
