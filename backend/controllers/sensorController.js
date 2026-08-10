const { SensorData } = require('../models');
const { getLatestSensorForBedeng } = require('../utils/sensorHelper');

/**
 * Menerima payload data sensor baru
 * POST /api/sensor-data
 */
exports.createSensorData = async (req, res, next) => {
  try {
    const { kelembaban, pH, bedeng_id, timestamp } = req.body;

    // Validasi input wajib
    if (kelembaban === undefined || pH === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Parameter sensor (kelembaban, pH) tidak boleh kosong.'
      });
    }

    const docRef = SensorData.doc();
    const sensorLog = {
      id: docRef.id,
      kelembaban: parseFloat(kelembaban),
      pH: parseFloat(pH),
      bedeng_id: bedeng_id !== undefined ? String(bedeng_id) : null,
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(sensorLog);

    res.status(201).json({
      success: true,
      message: 'Data sensor berhasil direkam.',
      data: sensorLog
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mendapatkan daftar seluruh data sensor dengan filter waktu opsional
 * GET /api/sensor-data?from=...&to=...&bedeng_id=...
 */
exports.getSensorData = async (req, res, next) => {
  try {
    const { from, to, bedeng_id } = req.query;
    
    let query = SensorData;
    if (bedeng_id) {
      // Support matching string or numeric bedeng_id representation defensively
      query = query.where('bedeng_id', 'in', [String(bedeng_id), parseInt(bedeng_id)]);
    }

    const snapshot = await query.get();
    let records = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.timestamp) {
        data.timestamp = doc.createTime ? doc.createTime.toDate().toISOString() : new Date().toISOString();
      }
      records.push(data);
    });

    // In-memory filters for time boundaries to avoid index requirement
    if (from) {
      const fromDate = new Date(from);
      records = records.filter(r => new Date(r.timestamp) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      records = records.filter(r => new Date(r.timestamp) <= toDate);
    }

    // Sort by timestamp ASC
    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mendapatkan satu data sensor paling terbaru
 * GET /api/sensor-data/latest?bedeng_id=...
 */
exports.getLatestSensorData = async (req, res, next) => {
  try {
    const { bedeng_id } = req.query;
    
    const latest = await getLatestSensorForBedeng(bedeng_id);
    if (!latest) {
      return res.status(404).json({
        success: false,
        message: 'Data sensor belum tersedia.'
      });
    }

    res.status(200).json({
      success: true,
      data: latest
    });
  } catch (error) {
    next(error);
  }
};
