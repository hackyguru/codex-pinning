const fetch = require('node-fetch');

async function testUserStatsAPI() {
  console.log('🧪 Testing /api/user/stats endpoint...\n');
  
  try {
    // Test the API endpoint directly
    const response = await fetch('http://localhost:3001/api/user/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // We can't easily get the auth token from here, so this will fail with 401
        // But we can see if the server is responding
      },
    });

    console.log(`Status: ${response.status}`);
    
    const data = await response.text();
    console.log('Response:', data);

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testUserStatsAPI().catch(error => {
  console.error('💥 Script failed:', error);
}); 