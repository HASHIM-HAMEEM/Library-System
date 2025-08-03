// Route Testing Script for GStore Application
const BASE_URL = 'http://localhost:5173';

// Test route accessibility
async function testRoute(path, expectedStatus = 200, description = '') {
  try {
    const response = await fetch(`${BASE_URL}${path}`);
    const status = response.status;
    const statusText = response.statusText;
    
    console.log(`${path.padEnd(25)} | Status: ${status} | ${description}`);
    
    if (status === expectedStatus) {
      return { success: true, status, path };
    } else {
      return { success: false, status, path, expected: expectedStatus };
    }
  } catch (error) {
    console.log(`${path.padEnd(25)} | ERROR: ${error.message}`);
    return { success: false, error: error.message, path };
  }
}

// Test all application routes
async function testAllRoutes() {
  console.log('\n=== Testing Application Routes ===');
  console.log('Route'.padEnd(25) + ' | Status | Description');
  console.log('-'.repeat(70));
  
  const routes = [
    { path: '/', description: 'Root - should redirect' },
    { path: '/login', description: 'Login page' },
    { path: '/admin', description: 'Admin dashboard (protected)' },
    { path: '/admin/qr-scanner', description: 'QR Scanner (protected)' },
    { path: '/admin/invite', description: 'Admin invite (protected)' },
    { path: '/nonexistent', description: 'Non-existent route (should redirect)' }
  ];
  
  const results = [];
  
  for (const route of routes) {
    const result = await testRoute(route.path, 200, route.description);
    results.push(result);
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Test static assets
async function testStaticAssets() {
  console.log('\n=== Testing Static Assets ===');
  console.log('Asset'.padEnd(25) + ' | Status | Description');
  console.log('-'.repeat(70));
  
  const assets = [
    { path: '/favicon.svg', description: 'Favicon' },
    { path: '/src/main.tsx', description: 'Main TypeScript file (should be processed)' },
    { path: '/src/index.css', description: 'Main CSS file (should be processed)' }
  ];
  
  const results = [];
  
  for (const asset of assets) {
    const result = await testRoute(asset.path, 200, asset.description);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Test API endpoints through the frontend
async function testFrontendAPI() {
  console.log('\n=== Testing Frontend API Integration ===');
  
  try {
    // Test if the frontend can load without JavaScript errors
    const response = await fetch(`${BASE_URL}/login`);
    const html = await response.text();
    
    // Check for essential elements in the HTML
    const hasReactRoot = html.includes('id="root"');
    const hasViteScript = html.includes('type="module"');
    const hasTitle = html.includes('<title>');
    
    console.log('HTML Structure:');
    console.log(`  React Root Element: ${hasReactRoot ? '✅' : '❌'}`);
    console.log(`  Vite Module Script: ${hasViteScript ? '✅' : '❌'}`);
    console.log(`  Page Title: ${hasTitle ? '✅' : '❌'}`);
    
    return {
      htmlStructure: hasReactRoot && hasViteScript && hasTitle,
      response: response.status === 200
    };
  } catch (error) {
    console.log('❌ Frontend API test error:', error.message);
    return { error: error.message };
  }
}

// Test performance metrics
async function testPerformance() {
  console.log('\n=== Testing Performance Metrics ===');
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/login`);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`Response Time: ${responseTime}ms`);
    console.log(`Status: ${response.status}`);
    console.log(`Content Length: ${response.headers.get('content-length') || 'Unknown'}`);
    
    // Performance thresholds
    const isGoodPerformance = responseTime < 1000; // Under 1 second
    const isAcceptablePerformance = responseTime < 3000; // Under 3 seconds
    
    if (isGoodPerformance) {
      console.log('✅ Excellent performance');
    } else if (isAcceptablePerformance) {
      console.log('⚠️ Acceptable performance');
    } else {
      console.log('❌ Poor performance');
    }
    
    return { responseTime, status: response.status, performance: isGoodPerformance };
  } catch (error) {
    console.log('❌ Performance test error:', error.message);
    return { error: error.message };
  }
}

// Test security headers
async function testSecurityHeaders() {
  console.log('\n=== Testing Security Headers ===');
  
  try {
    const response = await fetch(`${BASE_URL}/login`);
    const headers = response.headers;
    
    const securityHeaders = {
      'X-Content-Type-Options': headers.get('x-content-type-options'),
      'X-Frame-Options': headers.get('x-frame-options'),
      'X-XSS-Protection': headers.get('x-xss-protection'),
      'Strict-Transport-Security': headers.get('strict-transport-security'),
      'Content-Security-Policy': headers.get('content-security-policy')
    };
    
    console.log('Security Headers:');
    Object.entries(securityHeaders).forEach(([header, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`  ${header}: ${status} ${value || 'Not set'}`);
    });
    
    return securityHeaders;
  } catch (error) {
    console.log('❌ Security headers test error:', error.message);
    return { error: error.message };
  }
}

// Main test runner
async function runRouteTests() {
  console.log('🧪 Starting Route Tests for GStore Application');
  console.log('='.repeat(70));
  
  const routeResults = await testAllRoutes();
  const assetResults = await testStaticAssets();
  const frontendResults = await testFrontendAPI();
  const performanceResults = await testPerformance();
  const securityResults = await testSecurityHeaders();
  
  console.log('\n=== Test Summary ===');
  
  // Route summary
  const successfulRoutes = routeResults.filter(r => r.success).length;
  const totalRoutes = routeResults.length;
  console.log(`Routes: ${successfulRoutes}/${totalRoutes} accessible`);
  
  // Asset summary
  const successfulAssets = assetResults.filter(r => r.success).length;
  const totalAssets = assetResults.length;
  console.log(`Assets: ${successfulAssets}/${totalAssets} accessible`);
  
  // Frontend summary
  if (frontendResults.htmlStructure && frontendResults.response) {
    console.log('Frontend: ✅ Structure and response OK');
  } else {
    console.log('Frontend: ❌ Issues detected');
  }
  
  // Performance summary
  if (performanceResults.performance) {
    console.log('Performance: ✅ Good response times');
  } else {
    console.log('Performance: ⚠️ Could be improved');
  }
  
  console.log('\n📝 All route tests completed!');
  console.log('🌐 Application URL: http://localhost:5173');
  console.log('\n💡 Next steps:');
  console.log('  1. Test authentication flows manually');
  console.log('  2. Test QR code functionality');
  console.log('  3. Test admin features');
  console.log('  4. Test responsive design on different devices');
}

// Run the tests
runRouteTests().catch(console.error);