const assert = require('assert');
const { calculateHPPAndProfit } = require('../utils/finance');

console.log('--- START HPP CALCULATION UNIT TESTS ---');

try {
  // Skenario 1: Biaya Rendah, Panen Tinggi (HPP Rendah, Untung Besar)
  console.log('Running Scenario 1: Low Cost, High Yield...');
  const res1 = calculateHPPAndProfit(5000000, 2000, 5000);
  assert.strictEqual(res1.total_biaya, 5000000);
  assert.strictEqual(res1.hasil_panen, 2000);
  assert.strictEqual(res1.hpp, 2500); // 5.000.000 / 2.000 = 2.500
  assert.strictEqual(res1.total_pendapatan, 10000000); // 2.000 * 5.000 = 10.000.000
  assert.strictEqual(res1.keuntungan, 5000000); // 10.000.000 - 5.000.000 = 5.000.000
  console.log('✓ Scenario 1 passed.');

  // Skenario 2: Biaya Tinggi, Panen Rendah (HPP Tinggi, Rugi)
  console.log('Running Scenario 2: High Cost, Low Yield...');
  const res2 = calculateHPPAndProfit(15000000, 1000, 8000);
  assert.strictEqual(res2.total_biaya, 15000000);
  assert.strictEqual(res2.hasil_panen, 1000);
  assert.strictEqual(res2.hpp, 15000); // 15.000.000 / 1.000 = 15.000
  assert.strictEqual(res2.total_pendapatan, 8000000); // 1.000 * 8.000 = 8.000.000
  assert.strictEqual(res2.keuntungan, -7000000); // 8.000.000 - 15.000.000 = -7.000.000
  console.log('✓ Scenario 2 passed.');

  // Skenario 3: Gagal Panen / Hasil Nol (HPP diset 0 untuk mencegah pembagian nol)
  console.log('Running Scenario 3: Harvest Failure (Yield = 0)...');
  const res3 = calculateHPPAndProfit(8000000, 0, 6000);
  assert.strictEqual(res3.total_biaya, 8000000);
  assert.strictEqual(res3.hasil_panen, 0);
  assert.strictEqual(res3.hpp, 0); // pembagian dengan nol dibatasi -> 0
  assert.strictEqual(res3.total_pendapatan, 0);
  assert.strictEqual(res3.keuntungan, -8000000); // rugi sebesar total biaya
  console.log('✓ Scenario 3 passed.');

  // Skenario 4: Siklus dengan hasil_panen terisi (> 0) menghasilkan HPP, BEP Volume, BEP Omset, & Estimasi Pendapatan non-nol
  console.log('Running Scenario 4: Valid Harvest Yield (> 0) generating non-zero BEP & Revenue...');
  const res4 = calculateHPPAndProfit(10000000, 500, 25000); // Biaya 10jt, Panen 500kg, Harga 25rb/kg
  assert.strictEqual(res4.total_biaya, 10000000);
  assert.strictEqual(res4.hasil_panen, 500);
  assert.strictEqual(res4.hpp, 20000); // 10.000.000 / 500 = 20.000 / kg
  assert.strictEqual(res4.total_pendapatan, 12500000); // 500 * 25.000 = 12.500.000
  assert.strictEqual(res4.keuntungan, 2500000); // 12.500.000 - 10.000.000 = 2.500.000
  assert.strictEqual(res4.bep_volume, 400); // 10.000.000 / 25.000 = 400 kg
  assert.strictEqual(res4.bep_omset, 10000000); // 400 * 25.000 = 10.000.000
  assert.ok(res4.hpp > 0, 'HPP must be greater than 0');
  assert.ok(res4.bep_volume > 0, 'BEP Volume must be greater than 0');
  assert.ok(res4.bep_omset > 0, 'BEP Omset must be greater than 0');
  assert.ok(res4.total_pendapatan > 0, 'Total Pendapatan must be greater than 0');
  console.log('✓ Scenario 4 passed.');

  console.log('\n========================================');
  console.log('🎉 ALL HPP UNIT TESTS COMPLETED SUCCESSFULLY!');
  console.log('========================================');
  process.exit(0);
} catch (error) {
  console.error('\n❌ UNIT TEST FAILED:', error.message);
  process.exit(1);
}
