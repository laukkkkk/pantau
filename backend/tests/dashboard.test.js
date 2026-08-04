const assert = require('assert');

console.log('--- START INTEGRATION TESTS: BACKEND DASHBOARD AGGREGATE ---');

const BACKEND_URL = 'http://localhost:5001/api';

async function runTests() {
  try {
    const res = await fetch(`${BACKEND_URL}/dashboard/ringkasan`);
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    
    const resData = await res.json();
    assert.strictEqual(resData.success, true);
    assert.ok(resData.data);
    
    // Check fields
    const data = resData.data;
    assert.ok('sensor_terbaru' in data);
    assert.ok('siklus_aktif' in data);
    assert.ok('total_siklus_aktif' in data);
    assert.ok('total_biaya_bulan_ini' in data);
    assert.ok('siklus_history' in data);
    
    console.log('[SUCCESS] GET /api/dashboard/ringkasan passed validation.');
    console.log('sensor_terbaru:', data.sensor_terbaru);
    console.log('siklus_aktif:', data.siklus_aktif);
    console.log('total_siklus_aktif:', data.total_siklus_aktif);
    console.log('total_biaya_bulan_ini:', data.total_biaya_bulan_ini);
    console.log('siklus_history (count):', data.siklus_history ? data.siklus_history.length : 0);
    
    console.log('\n==========================================');
    console.log('DASHBOARD INTEGRATION TESTS PASSED!');
    console.log('==========================================');
    process.exit(0);
  } catch (error) {
    console.error('\n[FAIL] DASHBOARD INTEGRATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
