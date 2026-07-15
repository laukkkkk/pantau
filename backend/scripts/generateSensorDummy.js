const { SensorData } = require('../models');

async function run() {
  console.log('--- START GENERATING DUMMY SENSOR DATA ---');
  try {
    // Truncate existing data to start fresh for the demo
    await SensorData.destroy({ where: {}, force: true });
    console.log('✓ Existing sensor data cleared.');

    const dummyRecords = [];
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    // Loop 30 days backwards to create a clean daily history
    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(now - i * oneDayInMs);

      // Organic wavy patterns using mathematical functions + minor random noise
      const pH = parseFloat((6.4 + Math.sin(i / 3.0) * 0.4 + (Math.random() - 0.5) * 0.1).toFixed(2));
      const kelembaban = parseFloat((74.0 + Math.cos(i / 4.0) * 6.0 + (Math.random() - 0.5) * 2.0).toFixed(1));
      const N = parseFloat((54.0 + Math.sin(i / 5.0) * 5.0 + (Math.random() - 0.5) * 2.0).toFixed(1));
      const P = parseFloat((39.0 + Math.cos(i / 3.0) * 3.5 + (Math.random() - 0.5) * 1.5).toFixed(1));
      const K = parseFloat((64.0 + Math.sin(i / 4.0) * 6.0 + (Math.random() - 0.5) * 2.0).toFixed(1));

      dummyRecords.push({
        pH,
        kelembaban,
        N,
        P,
        K,
        timestamp,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await SensorData.bulkCreate(dummyRecords);
    console.log('✓ Successfully populated 30 days of sensor records to the database.');
    console.log('--- GENERATOR COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error generating dummy data:', error.message);
    process.exit(1);
  }
}

run();
