const assert = require('assert');
const { getFertilizerRecommendation } = require('../utils/fertilizerRules');

console.log('--- START FERTILIZER & SENSOR HELPER UNIT TESTS ---');

// 1. Mocking models for getLatestSensorForBedeng test
const mockSensorDataCollection = {
  where: (field, op, values) => {
    assert.strictEqual(field, 'bedeng_id');
    assert.strictEqual(op, 'in');
    assert.deepStrictEqual(values, ['1', 1]); // targetBedengId '1' and 1

    return {
      get: async () => {
        const docs = [
          {
            data: () => ({
              bedeng_id: '1',
              pH: 6.7,
              kelembaban: 70,
              timestamp: '2026-08-10T12:00:00.000Z'
            })
          },
          {
            data: () => ({
              bedeng_id: 1, // number type
              pH: 5.5,
              kelembaban: 60,
              timestamp: '2026-08-10T13:00:00.000Z' // newest
            })
          },
          {
            data: () => ({
              bedeng_id: '1',
              pH: 7.0,
              kelembaban: 80,
              timestamp: '2026-08-10T11:00:00.000Z'
            })
          }
        ];
        return {
          empty: false,
          forEach: (callback) => docs.forEach(callback)
        };
      }
    };
  }
};

// Override require cache for '../models' so sensorHelper loads our mock
require.cache[require.resolve('../models')] = {
  exports: {
    SensorData: mockSensorDataCollection
  }
};

const { getLatestSensorForBedeng } = require('../utils/sensorHelper');

async function runTests() {
  try {
    // Skenario A: Unit Test getLatestSensorForBedeng dengan data bedeng_id tipe campuran
    console.log('Running Scenario A: getLatestSensorForBedeng with mixed bedeng_id types (string & number)...');
    const latest = await getLatestSensorForBedeng('1');
    assert.ok(latest, 'Harus mengembalikan data');
    assert.strictEqual(latest.timestamp, '2026-08-10T13:00:00.000Z');
    assert.strictEqual(latest.pH, 5.5);
    assert.strictEqual(latest.kelembaban, 60);
    console.log('✓ Scenario A passed.');

    // Skenario 1: pH Rendah (Tanah Asam < 5.5) -> Harus mendapat saran Kapur Dolomit
    console.log('Running Scenario 1: Low pH...');
    const res1 = getFertilizerRecommendation(5.2);
    assert.match(res1.rekomendasi, /Kapur Dolomit/);
    assert.strictEqual(res1.dosis, 'Dolomit: 1.5 - 2 Ton / Hektar.');
    console.log('✓ Scenario 1 passed.');

    // Skenario 2: pH Tinggi (Tanah Basa > 7.2) -> Harus menyarankan belerang / ZA
    console.log('Running Scenario 2: High pH...');
    const res2 = getFertilizerRecommendation(7.5);
    assert.match(res2.rekomendasi, /belerang/);
    assert.strictEqual(res2.dosis, 'ZA: 200 - 300 kg / Hektar.');
    console.log('✓ Scenario 2 passed.');

    // Skenario 3: Kondisi Normal -> Harus menyarankan POC/Kompos rutin
    console.log('Running Scenario 3: Optimal/Normal Conditions...');
    const res3 = getFertilizerRecommendation(6.5);
    assert.match(res3.rekomendasi, /POC/);
    assert.strictEqual(res3.dosis, 'POC: 500 ml/tangki semprot, Kompos: 500 kg/Hektar.');
    console.log('✓ Scenario 3 passed.');

    console.log('\n======================================================');
    console.log('🎉 ALL FERTILIZER & SENSOR HELPER UNIT TESTS PASSED!');
    console.log('======================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNIT TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
