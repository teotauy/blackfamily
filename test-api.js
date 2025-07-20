#!/usr/bin/env node

// Simple API test script for the Family Tree backend
// Usage: node test-api.js <backend-url>

const backendUrl = process.argv[2] || 'http://localhost:5000';

console.log(`🧪 Testing Family Tree API at: ${backendUrl}`);
console.log('=====================================');

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${backendUrl}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
    return { success: true, data, status: response.status };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  // Test health endpoint
  await testEndpoint('/health');
  
  // Test API endpoints (these will fail without auth, but that's expected)
  await testEndpoint('/api/people');
  
  console.log('\n📋 Test Results:');
  console.log('================');
  console.log('✅ Health endpoint should work');
  console.log('⚠️  API endpoints require authentication');
  console.log('\n🔐 To test authenticated endpoints:');
  console.log('1. Register a user: POST /api/register');
  console.log('2. Login: POST /api/login');
  console.log('3. Use the returned token in Authorization header');
}

runTests().catch(console.error); 