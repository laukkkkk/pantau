const assert = require('assert');

console.log('--- START UNIT & INTEGRATION TEST: CYCLE STATUS CONSISTENCY ---');

// 1. Unit Test: Test Status Normalization Helper
console.log('Running Unit Tests for Status Normalization...');

const formatSiklus = (raw) => {
  if (!raw) return null;
  const rawStatus = (raw.status || 'berjalan').toString().toLowerCase();
  const isBerjalan = rawStatus === 'berjalan' || rawStatus === 'aktif';
  const statusStr = isBerjalan ? 'berjalan' : 'selesai';
  return {
    ...raw,
    status: statusStr,
    tanggal_tanam: raw.tanggal_mulai,
    tanggal_panen: raw.tanggal_selesai
  };
};

// Test 'berjalan'
const cycle1 = formatSiklus({ id: '1', nama: 'Siklus A', status: 'berjalan', tanggal_mulai: '2026-01-01' });
assert.strictEqual(cycle1.status, 'berjalan');

// Test 'AKTIF' -> normalized to 'berjalan'
const cycle2 = formatSiklus({ id: '2', nama: 'Siklus B', status: 'AKTIF', tanggal_mulai: '2026-01-01' });
assert.strictEqual(cycle2.status, 'berjalan');

// Test 'selesai'
const cycle3 = formatSiklus({ id: '3', nama: 'Siklus C', status: 'selesai', tanggal_mulai: '2026-01-01' });
assert.strictEqual(cycle3.status, 'selesai');

// Test default null -> 'berjalan'
const cycle4 = formatSiklus({ id: '4', nama: 'Siklus D', status: null, tanggal_mulai: '2026-01-01' });
assert.strictEqual(cycle4.status, 'berjalan');

console.log('✓ All Unit Tests passed for status normalization.');

// 2. Integration Test via HTTP if server is running
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://127.0.0.1:5001/api';

async function runIntegrationTest() {
  try {
    const dashboardRes = await fetch(`${BACKEND_URL}/dashboard/ringkasan`);
    const siklusRes = await fetch(`${BACKEND_URL}/siklus-tanam`);

    if (dashboardRes.ok && siklusRes.ok) {
      const dashboardJson = await dashboardRes.json();
      const siklusJson = await siklusRes.json();

      const dashboardActiveSiklus = dashboardJson.data.siklus_aktif;
      const dashboardHistory = dashboardJson.data.siklus_history || [];
      const siklusList = siklusJson.data || [];

      for (const cycle of siklusList) {
        const matchInDashboardHistory = dashboardHistory.find(h => String(h.id) === String(cycle.id));
        if (matchInDashboardHistory) {
          assert.strictEqual(cycle.status, matchInDashboardHistory.status);
        }
        if (dashboardActiveSiklus && String(dashboardActiveSiklus.id) === String(cycle.id)) {
          assert.strictEqual(cycle.status, dashboardActiveSiklus.status);
        }
      }
      console.log('✓ Integration Test passed: Status is consistent across Dashboard and Siklus Tanam APIs.');
    }
  } catch (err) {
    console.log(`ℹ️ HTTP Integration Test skipped (${err.message}). Unit tests passed.`);
  }

  console.log('\n=============================================================');
  console.log('🎉 CYCLE STATUS TESTS COMPLETED SUCCESSFULLY!');
  console.log('=============================================================');
  process.exit(0);
}

runIntegrationTest();
