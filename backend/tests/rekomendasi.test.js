const assert = require('assert');
const { getFertilizerRecommendation } = require('../utils/fertilizerRules');

console.log('--- START FERTILIZER RECOMMENDATION UNIT TESTS ---');

try {
  // Skenario 1: pH Rendah (Tanah Asam) -> Harus mendapat saran Kapur Dolomit
  console.log('Running Scenario 1: Low pH...');
  const res1 = getFertilizerRecommendation(5.2, 60, 50, 60);
  assert.match(res1.rekomendasi, /Kapur Dolomit/);
  assert.strictEqual(res1.dosis, '1.5 - 2 Ton / Hektar');
  console.log('✓ Scenario 1 passed.');

  // Skenario 2: Kandungan N, P, K semuanya Rendah -> Harus menyarankan NPK Majemuk Phonska
  console.log('Running Scenario 2: All NPK Low...');
  const res2 = getFertilizerRecommendation(6.5, 30, 20, 25);
  assert.match(res2.rekomendasi, /NPK Phonska/);
  assert.strictEqual(res2.dosis, '300 - 400 kg / Hektar');
  console.log('✓ Scenario 2 passed.');

  // Skenario 3: Hanya N Rendah -> Harus menyarankan Urea/ZA
  console.log('Running Scenario 3: Only Nitrogen Low...');
  const res3 = getFertilizerRecommendation(6.5, 30, 50, 60);
  assert.match(res3.rekomendasi, /Urea/);
  assert.strictEqual(res3.dosis, '150 - 200 kg / Hektar');
  console.log('✓ Scenario 3 passed.');

  // Skenario 4: Hanya P Rendah -> Harus menyarankan SP-36/TSP
  console.log('Running Scenario 4: Only Phosphorus Low...');
  const res4 = getFertilizerRecommendation(6.5, 60, 20, 60);
  assert.match(res4.rekomendasi, /SP-36/);
  assert.strictEqual(res4.dosis, '100 - 150 kg / Hektar');
  console.log('✓ Scenario 4 passed.');

  // Skenario 5: Hanya K Rendah -> Harus menyarankan KCl
  console.log('Running Scenario 5: Only Potassium Low...');
  const res5 = getFertilizerRecommendation(6.5, 60, 50, 20);
  assert.match(res5.rekomendasi, /KCI/);
  assert.strictEqual(res5.dosis, '75 - 100 kg / Hektar');
  console.log('✓ Scenario 5 passed.');

  // Skenario 6: Kondisi Normal -> Harus menyarankan POC/Kompos rutin
  console.log('Running Scenario 6: Optimal/Normal Conditions...');
  const res6 = getFertilizerRecommendation(6.8, 60, 55, 65);
  assert.match(res6.rekomendasi, /POC/);
  assert.strictEqual(res6.dosis, '500 ml / tangki semprot (POC) atau 500 kg / Hektar (Kompos)');
  console.log('✓ Scenario 6 passed.');

  console.log('\n========================================');
  console.log('🎉 ALL FERTILIZER RULES UNIT TESTS PASSED!');
  console.log('========================================');
  process.exit(0);
} catch (error) {
  console.error('\n❌ UNIT TEST FAILED:', error.message);
  process.exit(1);
}
