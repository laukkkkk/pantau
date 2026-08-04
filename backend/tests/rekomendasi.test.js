const assert = require('assert');
const { getFertilizerRecommendation } = require('../utils/fertilizerRules');

console.log('--- START FERTILIZER RECOMMENDATION UNIT TESTS ---');

try {
  // Skenario 1: pH Rendah (Tanah Asam < 5.5) -> Harus mendapat saran Kapur Dolomit
  console.log('Running Scenario 1: Low pH...');
  const res1 = getFertilizerRecommendation(5.2);
  assert.match(res1.rekomendasi, /Kapur Dolomit/);
  assert.strictEqual(res1.dosis, '1.5 - 2 Ton / Hektar');
  console.log('✓ Scenario 1 passed.');

  // Skenario 2: pH Tinggi (Tanah Basa > 7.2) -> Harus menyarankan belerang / ZA
  console.log('Running Scenario 2: High pH...');
  const res2 = getFertilizerRecommendation(7.5);
  assert.match(res2.rekomendasi, /belerang/);
  assert.strictEqual(res2.dosis, '200 - 300 kg / Hektar');
  console.log('✓ Scenario 2 passed.');

  // Skenario 3: Kondisi Normal -> Harus menyarankan POC/Kompos rutin
  console.log('Running Scenario 3: Optimal/Normal Conditions...');
  const res3 = getFertilizerRecommendation(6.5);
  assert.match(res3.rekomendasi, /POC/);
  assert.strictEqual(res3.dosis, '500 ml / tangki semprot (POC) atau 500 kg / Hektar (Kompos)');
  console.log('✓ Scenario 3 passed.');

  console.log('\n========================================');
  console.log('🎉 ALL FERTILIZER RULES UNIT TESTS PASSED!');
  console.log('========================================');
  process.exit(0);
} catch (error) {
  console.error('\n❌ UNIT TEST FAILED:', error.message);
  process.exit(1);
}
