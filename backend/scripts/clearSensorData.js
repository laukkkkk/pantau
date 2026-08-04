const { db, SensorData } = require('../models');

async function run() {
  console.log('--- START CLEARING SENSOR DATA FROM FIRESTORE ---');
  try {
    const snapshot = await SensorData.get();
    if (snapshot.empty) {
      console.log('✓ No sensor data found in Firestore.');
      process.exit(0);
    }

    console.log(`Found ${snapshot.size} documents to delete.`);

    // Firestore batch limit is 500 operations per batch
    const docs = snapshot.docs;
    const batchSize = 400; // safe margin
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);
      
      chunk.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✓ Deleted chunk of ${chunk.length} documents...`);
    }

    console.log('✓ All sensor data cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error clearing sensor data:', error.message);
    process.exit(1);
  }
}

run();
