const { JadwalKegiatan } = require('../models');

/**
 * Mendapatkan daftar seluruh jadwal kegiatan
 * GET /api/jadwal-kegiatan
 */
exports.getJadwal = async (req, res, next) => {
  try {
    const list = await JadwalKegiatan.findAll({
      order: [['tanggal', 'ASC']]
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
 * Membuat entri jadwal kegiatan baru
 * POST /api/jadwal-kegiatan
 */
exports.createJadwal = async (req, res, next) => {
  try {
    const { nama_kegiatan, tanggal, status, deskripsi } = req.body;

    if (!nama_kegiatan || !tanggal) {
      return res.status(400).json({
        success: false,
        message: 'Kolom nama_kegiatan dan tanggal wajib diisi.'
      });
    }

    const jadwalBaru = await JadwalKegiatan.create({
      nama_kegiatan,
      tanggal,
      status: status || 'BELUM_MULAI',
      deskripsi
    });

    res.status(201).json({
      success: true,
      message: 'Jadwal kegiatan berhasil dibuat.',
      data: jadwalBaru
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui status / detail jadwal kegiatan
 * PATCH /api/jadwal-kegiatan/:id
 */
exports.updateJadwal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nama_kegiatan, tanggal, status, deskripsi } = req.body;

    const record = await JadwalKegiatan.findByPk(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Jadwal kegiatan dengan ID ${id} tidak ditemukan.`
      });
    }

    const updates = {};
    if (nama_kegiatan !== undefined) updates.nama_kegiatan = nama_kegiatan;
    if (tanggal !== undefined) updates.tanggal = tanggal;
    if (status !== undefined) updates.status = status;
    if (deskripsi !== undefined) updates.deskripsi = deskripsi;

    await record.update(updates);

    res.status(200).json({
      success: true,
      message: 'Jadwal kegiatan berhasil diperbarui.',
      data: record
    });
  } catch (error) {
    next(error);
  }
};
