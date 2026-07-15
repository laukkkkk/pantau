const { RekomendasiPupuk, SensorData } = require('../models');
const { getFertilizerRecommendation } = require('../utils/fertilizerRules');

/**
 * Mendapatkan daftar riwayat rekomendasi pupuk
 * GET /api/rekomendasi-pupuk
 */
exports.getRekomendasi = async (req, res, next) => {
  try {
    const list = await RekomendasiPupuk.findAll({
      order: [['tanggal', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Membuat rekomendasi pemupukan baru berbasis sensor
 * POST /api/rekomendasi-pupuk
 */
exports.createRekomendasi = async (req, res, next) => {
  try {
    let { pH, N, P, K } = req.body;

    // Jika parameter input body tidak lengkap, ambil dari data sensor IoT terakhir di DB
    if (pH === undefined || N === undefined || P === undefined || K === undefined) {
      const latestSensor = await SensorData.findOne({
        order: [['timestamp', 'DESC']]
      });

      if (latestSensor) {
        pH = pH !== undefined ? pH : latestSensor.pH;
        N = N !== undefined ? N : latestSensor.N;
        P = P !== undefined ? P : latestSensor.P;
        K = K !== undefined ? K : latestSensor.K;
      } else {
        // Fallback jika database sensor kosong
        pH = pH !== undefined ? pH : 6.5;
        N = N !== undefined ? N : 60;
        P = P !== undefined ? P : 50;
        K = K !== undefined ? K : 60;
      }
    }

    // Eksekusi logic rule-based
    const result = getFertilizerRecommendation(pH, N, P, K);

    // Simpan hasil ke database
    const rekomendasiBaru = await RekomendasiPupuk.create({
      kandungan_sensor: {
        pH: parseFloat(pH),
        N: parseFloat(N),
        P: parseFloat(P),
        K: parseFloat(K)
      },
      rekomendasi: result.rekomendasi,
      dosis: result.dosis,
      tanggal: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Rekomendasi pemupukan baru berhasil dibuat.',
      data: rekomendasiBaru
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui data rekomendasi (ubah saran / dosis secara manual)
 * PATCH /api/rekomendasi-pupuk/:id
 */
exports.updateRekomendasi = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rekomendasi, dosis, status } = req.body;

    const record = await RekomendasiPupuk.findByPk(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Log rekomendasi pupuk dengan ID ${id} tidak ditemukan.`
      });
    }

    const updates = {};
    if (rekomendasi !== undefined) updates.rekomendasi = rekomendasi;
    if (dosis !== undefined) updates.dosis = dosis;
    if (status !== undefined) updates.status = status;

    await record.update(updates);

    res.status(200).json({
      success: true,
      message: 'Data rekomendasi berhasil diperbarui.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};
