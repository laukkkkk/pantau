const { db, SensorData } = require('../models');

async function run() {
  console.log('--- START GENERATING DUMMY SENSOR DATA (FIRESTORE) ---');
  try {
    // 1. Clear existing sensor data (Firestore batch delete)
    const snapshot = await SensorData.get();
    if (!snapshot.empty) {
      const deleteBatch = db.batch();
      snapshot.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
      console.log('✓ Existing sensor data cleared.');
    }

    const dummyRecords = [];
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    // Loop 30 days backwards to create a clean daily history
    for (let i = 29; i >= 0; i--) {
      const timestamp = new Date(now - i * oneDayInMs).toISOString();

      for (let b = 1; b <= 16; b++) {
        // Organic wavy patterns using mathematical functions + minor random noise
        const pH = parseFloat((6.4 + Math.sin((i + b) / 3.0) * 0.4 + (Math.random() - 0.5) * 0.1).toFixed(2));
        const kelembaban = parseFloat((74.0 + Math.cos((i - b) / 4.0) * 6.0 + (Math.random() - 0.5) * 2.0).toFixed(1));

        dummyRecords.push({
          pH,
          kelembaban,
          bedeng_id: String(b),
          timestamp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 2. Perform batched writes (Firestore limits batches to 500 operations. We have exactly 480 operations)
    const writeBatch = db.batch();
    dummyRecords.forEach(record => {
      const docRef = SensorData.doc();
      writeBatch.set(docRef, {
        id: docRef.id,
        ...record
      });
    });
    await writeBatch.commit();

    console.log('✓ Successfully populated 30 days of sensor records to Firestore (480 documents).');
    console.log('--- GENERATOR COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error generating dummy data:', error.message);
    process.exit(1);
  }
}

run();
