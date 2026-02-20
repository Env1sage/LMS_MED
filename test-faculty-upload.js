// Test script for faculty content upload
const API_URL = 'http://localhost:3001/api';

// Test data
const testData = {
  type: 'NOTES',
  title: 'Test Faculty Notes',
  description: 'This is a test description with more than 20 characters to pass validation',
  subject: 'Custom',
  topic: 'Test Topic',
  subTopic: '',
  difficultyLevel: 'K',
  estimatedDuration: 30,
  competencyIds: [],
  secureAccessUrl: '/uploads/books/test-file.pdf',
  deliveryType: 'REDIRECT',
  watermarkEnabled: false,
  sessionExpiryMinutes: 60,
};

async function testCreateLearningUnit() {
  console.log('\n=== Testing Faculty Learning Unit Creation ===\n');
  
  // First, login as faculty
  console.log('Step 1: Login as faculty...');
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'faculty1@aiims-demo.edu',
      password: 'Demo@2026',
    }),
  });
  
  if (!loginResponse.ok) {
    console.error('❌ Login failed:', await loginResponse.text());
    return;
  }
  
  const { accessToken } = await loginResponse.json();
  console.log('✅ Login successful\n');
  
  // Create learning unit
  console.log('Step 2: Creating learning unit...');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  const createResponse = await fetch(`${API_URL}/learning-units`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(testData),
  });
  
  const responseText = await createResponse.text();
  
  if (!createResponse.ok) {
    console.error('❌ Failed to create learning unit');
    console.error('Status:', createResponse.status);
    console.error('Response:', responseText);
    try {
      const errorData = JSON.parse(responseText);
      console.error('Error details:', JSON.stringify(errorData, null, 2));
    } catch (e) {
      // Response wasn't JSON
    }
    return;
  }
  
  const createdUnit = JSON.parse(responseText);
  console.log('✅ Learning unit created successfully!');
  console.log('Created unit:', JSON.stringify(createdUnit, null, 2));
  console.log('\n✅ Test completed successfully!');
}

testCreateLearningUnit().catch(console.error);
