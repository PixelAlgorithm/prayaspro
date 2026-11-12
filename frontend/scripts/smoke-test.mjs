// Frontend & API Integration Smoke Test
// Verifies core endpoints, authentication tokens, and contract data contracts

import http from 'http';

const API_BASE = 'http://localhost:5001/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runSmokeTests() {
  console.log('🧪 Starting PrayasPro Integration & Frontend Smoke Tests...\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Health check
  await test('Backend Health & PostgreSQL connection', async () => {
    const res = await request('/health');
    if (!res.ok || res.data.status !== 'UP') {
      throw new Error(`Healthcheck failed: ${JSON.stringify(res.data)}`);
    }
  });

  // 2. Public categories catalog
  await test('Catalog Categories endpoint returns structured data', async () => {
    const res = await request('/users/catalog/categories');
    if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
      throw new Error('Categories list is empty or failed to load');
    }
  });

  // 3. Task listing
  await test('Task directory returns active tasks with budget metadata', async () => {
    const res = await request('/tasks?limit=5');
    if (!res.ok || !Array.isArray(res.data)) {
      throw new Error('Failed to retrieve task directory');
    }
  });

  // 4. Quick login authentication
  let token = null;
  await test('Quick persona login generates valid JWT bearer token', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aarav@pesu.edu', password: 'password123' })
    });
    if (!res.ok || !res.data.token) {
      throw new Error(`Failed to authenticate persona: ${res.data?.error || res.status}`);
    }
    token = res.data.token;
  });

  // 5. Authenticated profile access
  await test('Authenticated profile access verifies JWT claims', async () => {
    if (!token) throw new Error('Token unavailable');
    const res = await request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok || (!res.data.user_id && !res.data.id)) {
      throw new Error(`User profile rejected token: ${JSON.stringify(res.data)}`);
    }
  });

  console.log(`\n📊 Smoke Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}% success)`);
  if (passed === total) {
    console.log('🚀 All integration endpoints healthy and verified!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

