const { SiklusTanam, BiayaProduksi } = require('../models');

// Helper to format response so it includes both DB column names and API expected alias names
const formatSiklus = (siklusInstance) => {
  if (!siklusInstance) return null;
  const raw = siklusInstance.toJSON();
  return {
    ...raw,
    tanggal_tanam: raw.tanggal_mulai,
    tanggal_panen: raw.tanggal_selesai
  };
};

/**
 * Membuat siklus tanam baru
 * POST /api/siklus-tanam
 */
exports.createSiklus = async (req, res, next) => {
  try {
    const { nama, tanaman, tanggal_tanam } = req.body;

    if (!nama || !tanaman || !tanggal_tanam) {
      return res.status(400).json({
        success: false,
        message: 'Nama, tanaman, dan tanggal_tanam wajib diisi.'
      });
    }

    const siklus = await SiklusTanam.create({
      nama,
      tanaman,
      tanggal_mulai: new Date(tanggal_tanam),
      status: 'berjalan'
    });

    res.status(201).json({
      success: true,
      message: 'Siklus tanam baru berhasil dibuat.',
      data: formatSiklus(siklus)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mendapatkan seluruh siklus tanam
 * GET /api/siklus-tanam
 */
exports.getAllSiklus = async (req, res, next) => {
  try {
    const data = await SiklusTanam.findAll({
      order: [['tanggal_mulai', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data: data.map(formatSiklus)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mendapatkan detail siklus tanam berdasarkan ID beserta rincian biaya produksinya
 * GET /api/siklus-tanam/:id
 */
exports.getSiklusById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const siklus = await SiklusTanam.findByPk(id, {
      include: [
        {
          model: BiayaProduksi,
          as: 'biaya_produksi',
          attributes: ['id', 'kategori', 'jumlah', 'tanggal']
        }
      ]
    });

    if (!siklus) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${id} tidak ditemukan.`
      });
    }

    res.status(200).json({
      success: true,
      data: formatSiklus(siklus)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui data siklus tanam
 * PUT /api/siklus-tanam/:id
 */
exports.updateSiklus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nama, tanaman, tanggal_tanam, tanggal_panen, hasil_panen, status } = req.body;

    const siklus = await SiklusTanam.findByPk(id);
    if (!siklus) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${id} tidak ditemukan.`
      });
    }

    if (nama) siklus.nama = nama;
    if (tanaman) siklus.tanaman = tanaman;
    if (tanggal_tanam) siklus.tanggal_mulai = new Date(tanggal_tanam);

    if (tanggal_panen !== undefined) {
      siklus.tanggal_selesai = tanggal_panen ? new Date(tanggal_panen) : null;
    }

    if (hasil_panen !== undefined) {
      siklus.hasil_panen = hasil_panen !== null ? parseFloat(hasil_panen) : null;
    }

    // Aturan Transisi Otomatis:
    // Jika tanggal_panen dan hasil_panen sudah diisi (tidak null), status berubah otomatis ke 'selesai'.
    if (siklus.tanggal_selesai && siklus.hasil_panen !== null) {
      siklus.status = 'selesai';
    } else if (status) {
      siklus.status = status;
    }

    await siklus.save();

    res.status(200).json({
      success: true,
      message: 'Siklus tanam berhasil diperbarui.',
      data: formatSiklus(siklus)
    });
  } catch (error) {
    next(error);
  }
};
