const { SiklusTanam, BiayaProduksi, LaporanKeuangan } = require('../models');

// Helper to format response so it includes both DB column names and API expected alias names
const formatSiklus = (raw, nameMap = null) => {
  if (!raw) return null;
  const rawStatus = (raw.status || 'berjalan').toString().toLowerCase();
  const isBerjalan = rawStatus === 'berjalan' || rawStatus === 'aktif';
  const statusStr = isBerjalan ? 'berjalan' : 'selesai';
  const prevId = raw.musim_sebelumnya_id || null;
  let prevNama = raw.musim_sebelumnya_nama || null;
  if (prevId && nameMap && nameMap.has(String(prevId))) {
    prevNama = nameMap.get(String(prevId));
  }
  return {
    ...raw,
    status: statusStr,
    tanggal_tanam: raw.tanggal_mulai,
    tanggal_panen: raw.tanggal_selesai,
    musim_sebelumnya_id: prevId,
    musim_sebelumnya_nama: prevNama
  };
};

/**
 * Membuat siklus tanam baru
 * POST /api/siklus-tanam
 */
exports.createSiklus = async (req, res, next) => {
  try {
    const { nama, tanaman, tanggal_tanam, musim_sebelumnya_id } = req.body;

    if (!nama || !tanaman || !tanggal_tanam) {
      return res.status(400).json({
        success: false,
        message: 'Nama, tanaman, dan tanggal_tanam wajib diisi.'
      });
    }

    let prevId = null;
    let prevNama = null;

    if (musim_sebelumnya_id) {
      prevId = String(musim_sebelumnya_id);
      const pDoc = await SiklusTanam.doc(prevId).get();
      if (!pDoc.exists) {
        return res.status(400).json({
          success: false,
          message: `Musim sebelumnya dengan ID ${prevId} tidak ditemukan.`
        });
      }
      const pData = pDoc.data();
      const pStatus = (pData.status || 'berjalan').toString().toLowerCase();
      if (pStatus === 'berjalan' || pStatus === 'aktif') {
        return res.status(400).json({
          success: false,
          message: 'Musim sebelumnya harus berstatus selesai.'
        });
      }

      // Check linear constraint: parent cannot be linked by another season already
      const existingLink = await SiklusTanam.where('musim_sebelumnya_id', '==', prevId).limit(1).get();
      if (!existingLink.empty) {
        return res.status(400).json({
          success: false,
          message: 'Musim ini sudah menjadi musim sebelumnya untuk musim lain.'
        });
      }

      prevNama = pData.nama || null;
    }

    const docRef = SiklusTanam.doc();
    const siklus = {
      id: docRef.id,
      nama: nama.trim(),
      tanaman: tanaman.trim(),
      tanggal_mulai: new Date(tanggal_tanam).toISOString(),
      tanggal_selesai: null,
      hasil_panen: null,
      status: 'berjalan',
      musim_sebelumnya_id: prevId,
      musim_sebelumnya_nama: prevNama,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(siklus);

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
    const snapshot = await SiklusTanam.get();
    const data = [];
    const nameMap = new Map();
    snapshot.forEach(doc => {
      const d = doc.data();
      data.push(d);
      nameMap.set(String(d.id), d.nama);
    });

    // Sort by tanggal_mulai DESC
    data.sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai));

    res.status(200).json({
      success: true,
      count: data.length,
      data: data.map(item => formatSiklus(item, nameMap))
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

    const sDoc = await SiklusTanam.doc(String(id)).get();
    if (!sDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${id} tidak ditemukan.`
      });
    }

    const siklusData = sDoc.data();

    let prevNama = siklusData.musim_sebelumnya_nama || null;
    if (siklusData.musim_sebelumnya_id && !prevNama) {
      const pDoc = await SiklusTanam.doc(String(siklusData.musim_sebelumnya_id)).get();
      if (pDoc.exists) {
        prevNama = pDoc.data().nama || null;
      }
    }

    // Fetch related biaya_produksi documents
    const biayaSnapshot = await BiayaProduksi.where('siklus_id', '==', String(id)).get();
    const biaya_produksi = [];
    biayaSnapshot.forEach(doc => {
      const b = doc.data();
      biaya_produksi.push({
        id: b.id,
        kategori: b.kategori,
        jumlah: parseFloat(b.jumlah),
        tanggal: b.tanggal
      });
    });

    // Sort biaya by tanggal DESC
    biaya_produksi.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const responseData = formatSiklus({
      ...siklusData,
      musim_sebelumnya_nama: prevNama,
      biaya_produksi
    });

    res.status(200).json({
      success: true,
      data: responseData
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
    const { nama, tanaman, tanggal_tanam, tanggal_panen, hasil_panen, status, musim_sebelumnya_id } = req.body;

    const docRef = SiklusTanam.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${id} tidak ditemukan.`
      });
    }

    const updates = {
      updatedAt: new Date().toISOString()
    };
    if (nama) updates.nama = nama.trim();
    if (tanaman) updates.tanaman = tanaman.trim();
    if (tanggal_tanam) updates.tanggal_mulai = new Date(tanggal_tanam).toISOString();

    if (tanggal_panen !== undefined) {
      updates.tanggal_selesai = tanggal_panen ? new Date(tanggal_panen).toISOString() : null;
    }

    if (hasil_panen !== undefined) {
      updates.hasil_panen = hasil_panen !== null && !isNaN(parseFloat(hasil_panen)) ? parseFloat(hasil_panen) : null;
    }

    if (musim_sebelumnya_id !== undefined) {
      if (musim_sebelumnya_id === null || musim_sebelumnya_id === '') {
        updates.musim_sebelumnya_id = null;
        updates.musim_sebelumnya_nama = null;
      } else {
        const prevId = String(musim_sebelumnya_id);
        if (prevId !== String(id)) {
          const pDoc = await SiklusTanam.doc(prevId).get();
          if (pDoc.exists) {
            const pData = pDoc.data();
            const pStatus = (pData.status || 'berjalan').toString().toLowerCase();
            if (pStatus !== 'berjalan' && pStatus !== 'aktif') {
              const existingLink = await SiklusTanam.where('musim_sebelumnya_id', '==', prevId).get();
              let isUsedByOther = false;
              existingLink.forEach(d => {
                if (String(d.id) !== String(id)) isUsedByOther = true;
              });
              if (!isUsedByOther) {
                updates.musim_sebelumnya_id = prevId;
                updates.musim_sebelumnya_nama = pData.nama || null;
              }
            }
          }
        }
      }
    }

    // Penanganan eksplisit perubahan status (misal ke 'selesai')
    if (status) {
      const normalizedStatus = status.toLowerCase();
      updates.status = normalizedStatus;
      if (normalizedStatus === 'selesai') {
        if (!updates.tanggal_selesai) {
          updates.tanggal_selesai = new Date().toISOString();
        }
      }
    } else {
      const currentSiklus = doc.data();
      const finalTanggalSelesai = updates.tanggal_selesai !== undefined ? updates.tanggal_selesai : currentSiklus.tanggal_selesai;
      const finalHasilPanen = updates.hasil_panen !== undefined ? updates.hasil_panen : currentSiklus.hasil_panen;

      if (finalTanggalSelesai && finalHasilPanen !== null) {
        updates.status = 'selesai';
      }
    }

    await docRef.update(updates);

    const updatedDoc = await docRef.get();

    res.status(200).json({
      success: true,
      message: 'Siklus tanam berhasil diperbarui.',
      data: formatSiklus(updatedDoc.data())
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Menghapus siklus tanam beserta data terkait
 * DELETE /api/siklus-tanam/:id
 */
exports.deleteSiklus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const docRef = SiklusTanam.doc(String(id));
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${id} tidak ditemukan.`
      });
    }

    // 1. Hapus dokumen Siklus Tanam
    await docRef.delete();

    // 2. Cascade delete data biaya_produksi terkait
    const biayaSnapshot = await BiayaProduksi.where('siklus_id', '==', String(id)).get();
    biayaSnapshot.forEach(async (bDoc) => {
      await BiayaProduksi.doc(bDoc.id).delete();
    });

    // 3. Cascade delete data laporan_keuangan terkait
    const laporanSnapshot = await LaporanKeuangan.where('siklus_id', '==', String(id)).get();
    laporanSnapshot.forEach(async (lDoc) => {
      await LaporanKeuangan.doc(lDoc.id).delete();
    });

    res.status(200).json({
      success: true,
      message: `Siklus tanam dengan ID ${id} beserta data terkait berhasil dihapus.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Menelusuri seluruh rantai musim terhubung dari satu ID musim
 * GET /api/siklus-tanam/:id/rantai
 */
exports.getSiklusChain = async (req, res, next) => {
  try {
    const { id } = req.params;

    const snapshot = await SiklusTanam.get();
    const mapByParent = new Map();
    const mapById = new Map();
    const nameMap = new Map();

    snapshot.forEach(doc => {
      const d = doc.data();
      mapById.set(String(d.id), d);
      nameMap.set(String(d.id), d.nama);
      if (d.musim_sebelumnya_id) {
        mapByParent.set(String(d.musim_sebelumnya_id), String(d.id));
      }
    });

    if (!mapById.has(String(id))) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${id} tidak ditemukan.`
      });
    }

    // Trace backwards to root parent
    let rootId = String(id);
    const visited = new Set();
    while (rootId && !visited.has(rootId)) {
      visited.add(rootId);
      const curr = mapById.get(rootId);
      if (curr && curr.musim_sebelumnya_id && mapById.has(String(curr.musim_sebelumnya_id))) {
        rootId = String(curr.musim_sebelumnya_id);
      } else {
        break;
      }
    }

    // Trace forward from root to end of chain
    const chain = [];
    let currId = rootId;
    const visitedForward = new Set();
    while (currId && mapById.has(currId) && !visitedForward.has(currId)) {
      visitedForward.add(currId);
      chain.push(formatSiklus(mapById.get(currId), nameMap));
      currId = mapByParent.get(currId) || null;
    }

    res.status(200).json({
      success: true,
      count: chain.length,
      data: chain
    });
  } catch (error) {
    next(error);
  }
};

