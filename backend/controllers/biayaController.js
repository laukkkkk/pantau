const { BiayaProduksi, SiklusTanam } = require('../models');

/**
 * Mencatat biaya produksi baru
 * POST /api/biaya-produksi
 */
exports.createBiaya = async (req, res, next) => {
  try {
    const { kategori, deskripsi, jumlah, tanggal, siklus_id } = req.body;

    // Validasi data wajib
    if (!kategori || jumlah === undefined || !tanggal || !siklus_id) {
      return res.status(400).json({
        success: false,
        message: 'Kategori, jumlah, tanggal, dan siklus_id wajib diisi.'
      });
    }

    // Validasi keberadaan siklus tanam
    const siklusDoc = await SiklusTanam.doc(String(siklus_id)).get();
    if (!siklusDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
      });
    }

    const docRef = BiayaProduksi.doc();
    const biaya = {
      id: docRef.id,
      kategori,
      deskripsi: deskripsi || '',
      jumlah: parseFloat(jumlah),
      tanggal: new Date(tanggal).toISOString(),
      siklus_id: String(siklus_id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(biaya);

    res.status(201).json({
      success: true,
      message: 'Biaya produksi berhasil dicatat.',
      data: biaya
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mendapatkan daftar seluruh biaya dengan filter opsional
 * GET /api/biaya-produksi?kategori=...&siklus_id=...&from=...&to=...
 */
exports.getAllBiaya = async (req, res, next) => {
  try {
    const { kategori, from, to, siklus_id } = req.query;
    
    let query = BiayaProduksi;
    if (siklus_id) {
      query = query.where('siklus_id', '==', String(siklus_id));
    }

    const snapshot = await query.get();
    let data = [];
    snapshot.forEach(doc => {
      data.push(doc.data());
    });

    // In-memory filters to prevent needing composite indexes
    if (kategori) {
      data = data.filter(item => item.kategori === kategori);
    }

    if (from) {
      const fromDate = new Date(from);
      data = data.filter(item => new Date(item.tanggal) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      data = data.filter(item => new Date(item.tanggal) <= toDate);
    }

    // Sort by tanggal DESC
    data.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // Manual join for SiklusTanam
    const dataWithSiklus = await Promise.all(
      data.map(async (item) => {
        let siklus_tanam = null;
        if (item.siklus_id) {
          const sDoc = await SiklusTanam.doc(String(item.siklus_id)).get();
          if (sDoc.exists) {
            const sData = sDoc.data();
            siklus_tanam = {
              id: sData.id,
              nama: sData.nama,
              status: sData.status
            };
          }
        }
        return {
          ...item,
          siklus_tanam
        };
      })
    );

    res.status(200).json({
      success: true,
      count: dataWithSiklus.length,
      data: dataWithSiklus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui data biaya produksi
 * PUT /api/biaya-produksi/:id
 */
exports.updateBiaya = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { kategori, deskripsi, jumlah, tanggal, siklus_id } = req.body;

    const docRef = BiayaProduksi.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Biaya produksi dengan ID ${id} tidak ditemukan.`
      });
    }

    const updates = {
      updatedAt: new Date().toISOString()
    };

    // Jika ingin mengubah siklus tanam, pastikan ID siklus baru ada
    if (siklus_id) {
      const newSiklusDoc = await SiklusTanam.doc(String(siklus_id)).get();
      if (!newSiklusDoc.exists) {
        return res.status(404).json({
          success: false,
          message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
        });
      }
      updates.siklus_id = String(siklus_id);
    }

    if (kategori) updates.kategori = kategori;
    if (deskripsi !== undefined) updates.deskripsi = deskripsi;
    if (jumlah !== undefined) updates.jumlah = parseFloat(jumlah);
    if (tanggal) updates.tanggal = new Date(tanggal).toISOString();

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.status(200).json({
      success: true,
      message: 'Biaya produksi berhasil diperbarui.',
      data: updatedDoc.data()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Menghapus catatan biaya produksi
 * DELETE /api/biaya-produksi/:id
 */
exports.deleteBiaya = async (req, res, next) => {
  try {
    const { id } = req.params;

    const docRef = BiayaProduksi.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Biaya produksi dengan ID ${id} tidak ditemukan.`
      });
    }

    await docRef.delete();

    res.status(200).json({
      success: true,
      message: 'Biaya produksi berhasil dihapus.'
    });
  } catch (error) {
    next(error);
  }
};
