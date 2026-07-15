const { SensorData } = require('../models');
const { Op } = require('sequelize');

/**
 * Menerima payload data sensor baru
 * POST /api/sensor-data
 */
exports.createSensorData = async (req, res, next) => {
  try {
    const { kelembaban, pH, N, P, K, timestamp } = req.body;

    // Validasi input wajib
    if (kelembaban === undefined || pH === undefined || N === undefined || P === undefined || K === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Parameter sensor (kelembaban, pH, N, P, K) tidak boleh kosong.'
      });
    }

    const sensorLog = await SensorData.create({
      kelembaban: parseFloat(kelembaban),
      pH: parseFloat(pH),
      N: parseFloat(N),
      P: parseFloat(P),
      K: parseFloat(K),
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

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
 * GET /api/sensor-data?from=...&to=...
 */
exports.getSensorData = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};

    if (from && to) {
      where.timestamp = {
        [Op.between]: [new Date(from), new Date(to)]
      };
    } else if (from) {
      where.timestamp = {
        [Op.gte]: new Date(from)
      };
    } else if (to) {
      where.timestamp = {
        [Op.lte]: new Date(to)
      };
    }

    const records = await SensorData.findAll({
      where,
      order: [['timestamp', 'ASC']]
    });

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
 * GET /api/sensor-data/latest
 */
exports.getLatestSensorData = async (req, res, next) => {
  try {
    const latest = await SensorData.findOne({
      order: [['timestamp', 'DESC']]
    });

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
