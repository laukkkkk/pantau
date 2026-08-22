const { SensorData, SiklusTanam, BiayaProduksi } = require('../models');

// Helper to format siklus object consistently with siklusController
const formatSiklusItem = (raw, nameMap = null) => {
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
 * Mendapatkan ringkasan dashboard (sensor terbaru, siklus aktif, total biaya bulan ini)
 * GET /api/dashboard/ringkasan
 */
exports.getRingkasan = async (req, res, next) => {
  try {
    // 1. Dapatkan data sensor paling terbaru
    const sensorSnapshot = await SensorData.orderBy('timestamp', 'desc').limit(1).get();
    const sensorTerbaru = sensorSnapshot.empty ? null : sensorSnapshot.docs[0].data();

    // 2. Dapatkan seluruh siklus tanam dari database
    const allSiklusSnapshot = await SiklusTanam.get();
    const allSiklusList = [];
    const nameMap = new Map();
    allSiklusSnapshot.forEach(doc => {
      const d = doc.data();
      allSiklusList.push(d);
      nameMap.set(String(d.id), d.nama);
    });
    // Sort by tanggal_mulai DESC in-memory
    allSiklusList.sort((a, b) => new Date(b.tanggal_mulai) - new Date(a.tanggal_mulai));

    // 3. Filter siklus aktif (status 'berjalan' atau 'aktif') secara terpusat
    const activeSiklusList = allSiklusList.filter(s => {
      const st = (s.status || 'berjalan').toString().toLowerCase();
      return st === 'berjalan' || st === 'aktif';
    });

    const siklusAktif = activeSiklusList.length > 0 ? activeSiklusList[0] : null;
    const totalSiklusAktif = activeSiklusList.length;

    // Filter histori siklus (hanya musim yang berstatus selesai)
    const finishedSiklusList = allSiklusList.filter(s => {
      const st = (s.status || '').toString().toLowerCase();
      return st !== 'berjalan' && st !== 'aktif';
    });

    // 4. Hitung total biaya produksi pada bulan berjalan ini
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const biayaSnapshot = await BiayaProduksi.get();
    let totalBiayaBulanIni = 0;
    biayaSnapshot.forEach(doc => {
      const item = doc.data();
      const itemDate = new Date(item.tanggal);
      if (itemDate >= startOfMonth && itemDate <= endOfMonth) {
        totalBiayaBulanIni += parseFloat(item.jumlah) || 0;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        sensor_terbaru: sensorTerbaru,
        siklus_aktif: formatSiklusItem(siklusAktif, nameMap),
        siklus_aktif_list: activeSiklusList.map(item => formatSiklusItem(item, nameMap)),
        total_siklus_aktif: totalSiklusAktif,
        total_biaya_bulan_ini: totalBiayaBulanIni,
        siklus_history: finishedSiklusList.map(item => formatSiklusItem(item, nameMap))
      }
    });
  } catch (error) {
    next(error);
  }
};
