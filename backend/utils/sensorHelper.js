const { SensorData } = require('../models');

/**
 * Mengambil data sensor terbaru untuk satu bedeng (defensive untuk tipe bedeng_id string/number)
 * @param {string|number} bedengId 
 * @returns {Promise<object|null>} Data sensor terbaru atau null jika tidak ada
 */
async function getLatestSensorForBedeng(bedengId) {
  if (!bedengId) return null;
  
  const query = SensorData.where('bedeng_id', 'in', [String(bedengId), parseInt(bedengId)]);
  const snapshot = await query.get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const records = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.timestamp) {
      data.timestamp = doc.createTime ? doc.createTime.toDate().toISOString() : new Date().toISOString();
    }
    records.push(data);
  });
  
  // Sort by timestamp DESC in memory
  records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return records[0];
}

module.exports = {
  getLatestSensorForBedeng
};
