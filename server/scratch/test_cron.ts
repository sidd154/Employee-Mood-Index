import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.PORT || 5000;
const CRON_SECRET = process.env.CRON_SECRET || 'super-secret-cron-token-change-in-prod';
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('--- Testing Cron Security and Execution ---');
  console.log(`Target URL: ${BASE_URL}`);

  // 1. Test Unauthenticated Request
  try {
    console.log('\n[Test 1] Triggering morning cron WITHOUT authorization header...');
    const res = await fetch(`${BASE_URL}/cron/morning`);
    console.log(`Response Status: ${res.status}`);
    const data = await res.json();
    console.log('Response Body:', data);
    if (res.status === 401) {
      console.log('✅ Test 1 Passed: Unauthorized request blocked as expected.');
    } else {
      console.log('❌ Test 1 Failed: Request was not blocked.');
    }
  } catch (error) {
    console.error('Test 1 Error:', error);
  }

  // 2. Test Invalid Token Request
  try {
    console.log('\n[Test 2] Triggering morning cron with INVALID token...');
    const res = await fetch(`${BASE_URL}/cron/morning`, {
      headers: {
        'Authorization': 'Bearer wrong-token-123'
      }
    });
    console.log(`Response Status: ${res.status}`);
    const data = await res.json();
    console.log('Response Body:', data);
    if (res.status === 401) {
      console.log('✅ Test 2 Passed: Request with wrong token blocked as expected.');
    } else {
      console.log('❌ Test 2 Failed: Request was not blocked.');
    }
  } catch (error) {
    console.error('Test 2 Error:', error);
  }

  // 3. Test Valid Token Request
  try {
    console.log('\n[Test 3] Triggering morning cron with VALID token...');
    const res = await fetch(`${BASE_URL}/cron/morning`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    console.log(`Response Status: ${res.status}`);
    const data = await res.json();
    console.log('Response Body:', data);
    if (res.ok) {
      console.log('✅ Test 3 Passed: Morning reminders processed successfully.');
    } else {
      console.log('❌ Test 3 Failed:', data);
    }
  } catch (error) {
    console.error('Test 3 Error:', error);
  }

  // 4. Test Afternoon Cron with Valid Token
  try {
    console.log('\n[Test 4] Triggering afternoon cron with VALID token...');
    const res = await fetch(`${BASE_URL}/cron/afternoon`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    console.log(`Response Status: ${res.status}`);
    const data = await res.json();
    console.log('Response Body:', data);
    if (res.ok) {
      console.log('✅ Test 4 Passed: Afternoon reminders processed successfully.');
    } else {
      console.log('❌ Test 4 Failed:', data);
    }
  } catch (error) {
    console.error('Test 4 Error:', error);
  }
}

runTests();
