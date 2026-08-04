const { RekomendasiPupuk, SensorData } = require('../models');
const { getFertilizerRecommendation } = require('../utils/fertilizerRules');

/**
 * Mendapatkan daftar riwayat rekomendasi pupuk
 * GET /api/rekomendasi-pupuk
 */
exports.getRekomendasi = async (req, res, next) => {
  try {
    const snapshot = await RekomendasiPupuk.get();
    const list = [];
    snapshot.forEach(doc => {
      list.push(doc.data());
    });

    // Sort by tanggal DESC
    list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

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
    let { pH, kelembaban, bedeng_id, bedeng_nama } = req.body;

    const targetBedengId = bedeng_id ? String(bedeng_id) : '1';
    const targetBedengNama = bedeng_nama || `Bedeng ${targetBedengId}`;

    // If parameters not provided, fetch latest sensor readings for this specific bedeng
    if (pH === undefined || kelembaban === undefined) {
      let foundData = null;

      // Try to find the sensor reading in the 100 most recent global records to avoid composite index requirement
      const globalSnapshot = await SensorData.orderBy('timestamp', 'desc').limit(100).get();
      if (!globalSnapshot.empty) {
        const match = globalSnapshot.docs
          .map(doc => doc.data())
          .find(d => String(d.bedeng_id) === targetBedengId);
        if (match) {
          foundData = match;
        }
      }

      // If not found in the recent global logs, query the bedeng directly without orderBy (avoiding composite index)
      if (!foundData) {
        const bedengSnapshot = await SensorData.where('bedeng_id', '==', targetBedengId).get();
        if (!bedengSnapshot.empty) {
          const list = bedengSnapshot.docs.map(doc => doc.data());
          list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          foundData = list[0];
        }
      }

      if (foundData) {
        if (pH === undefined) pH = foundData.pH;
        if (kelembaban === undefined) kelembaban = foundData.kelembaban;
      } else {
        // Fallback to most recent global sensor reading
        const globalSnapshot = await SensorData.orderBy('timestamp', 'desc').limit(1).get();
        if (!globalSnapshot.empty) {
          const data = globalSnapshot.docs[0].data();
          if (pH === undefined) pH = data.pH;
          if (kelembaban === undefined) kelembaban = data.kelembaban;
        } else {
          if (pH === undefined) pH = 6.5;
          if (kelembaban === undefined) kelembaban = 75;
        }
      }
    }

    // Execute combined logic
    const result = getFertilizerRecommendation(pH, kelembaban);

    // Save to database
    const docRef = RekomendasiPupuk.doc();
    const rekomendasiBaru = {
      id: docRef.id,
      bedeng_id: targetBedengId,
      bedeng_nama: targetBedengNama,
      kandungan_sensor: {
        pH: parseFloat(pH),
        kelembaban: parseFloat(kelembaban)
      },
      rekomendasi: result.rekomendasi,
      dosis: result.dosis,
      tanggal: new Date().toISOString(),
      status: 'BELUM_SELESAI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(rekomendasiBaru);

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

    const docRef = RekomendasiPupuk.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Log rekomendasi pupuk dengan ID ${id} tidak ditemukan.`
      });
    }

    const updates = {
      updatedAt: new Date().toISOString()
    };
    if (rekomendasi !== undefined) updates.rekomendasi = rekomendasi;
    if (dosis !== undefined) updates.dosis = dosis;
    if (status !== undefined) updates.status = status;

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.status(200).json({
      success: true,
      message: 'Data rekomendasi berhasil diperbarui.',
      data: updatedDoc.data()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Menghapus data log rekomendasi pupuk
 * DELETE /api/rekomendasi-pupuk/:id
 */
exports.deleteRekomendasi = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = RekomendasiPupuk.doc(String(id));
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Log rekomendasi pupuk dengan ID ${id} tidak ditemukan.`
      });
    }

    await docRef.delete();

    res.status(200).json({
      success: true,
      message: `Log rekomendasi pupuk dengan ID ${id} berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
};
