const { JadwalKegiatan } = require('../models');

/**
 * Mendapatkan daftar seluruh jadwal kegiatan
 * GET /api/jadwal-kegiatan
 */
exports.getJadwal = async (req, res, next) => {
  try {
    const { kategori } = req.query;
    let query = JadwalKegiatan;
    
    if (kategori) {
      query = query.where('kategori', '==', kategori);
    }

    const snapshot = await query.get();
    const list = [];
    snapshot.forEach(doc => {
      list.push(doc.data());
    });

    // Sort by tanggal ASC
    list.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

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
    const { nama_kegiatan, tanggal, status, deskripsi, kategori } = req.body;

    if (!nama_kegiatan || !tanggal) {
      return res.status(400).json({
        success: false,
        message: 'Kolom nama_kegiatan dan tanggal wajib diisi.'
      });
    }

    const docRef = JadwalKegiatan.doc();
    const jadwalBaru = {
      id: docRef.id,
      nama_kegiatan,
      tanggal: new Date(tanggal).toISOString(),
      status: status || 'BELUM_MULAI',
      deskripsi: deskripsi || '',
      kategori: kategori || 'Tani',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(jadwalBaru);

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
    const { nama_kegiatan, tanggal, status, deskripsi, kategori } = req.body;

    const docRef = JadwalKegiatan.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Jadwal kegiatan dengan ID ${id} tidak ditemukan.`
      });
    }

    const updates = {
      updatedAt: new Date().toISOString()
    };
    if (nama_kegiatan !== undefined) updates.nama_kegiatan = nama_kegiatan;
    if (tanggal !== undefined) updates.tanggal = new Date(tanggal).toISOString();
    if (status !== undefined) updates.status = status;
    if (deskripsi !== undefined) updates.deskripsi = deskripsi;
    if (kategori !== undefined) updates.kategori = kategori;

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.status(200).json({
      success: true,
      message: 'Jadwal kegiatan berhasil diperbarui.',
      data: updatedDoc.data()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Menghapus entri jadwal kegiatan
 * DELETE /api/jadwal-kegiatan/:id
 */
exports.deleteJadwal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const docRef = JadwalKegiatan.doc(String(id));
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Jadwal kegiatan dengan ID ${id} tidak ditemukan.`
      });
    }

    await docRef.delete();

    res.status(200).json({
      success: true,
      message: `Jadwal kegiatan dengan ID ${id} berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
};
