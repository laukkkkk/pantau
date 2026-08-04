const { LaporanKeuangan, SiklusTanam, BiayaProduksi } = require('../models');
const { calculateHPPAndProfit } = require('../utils/finance');
const PDFDocument = require('pdfkit');

/**
 * Mendapatkan laporan keuangan berdasarkan ID Siklus
 * GET /api/laporan-keuangan/:siklus_id
 */
exports.getLaporanBySiklus = async (req, res, next) => {
  try {
    const { siklus_id } = req.params;

    const laporanSnapshot = await LaporanKeuangan.where('siklus_id', '==', String(siklus_id)).limit(1).get();

    if (laporanSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `Laporan keuangan untuk siklus ID ${siklus_id} belum dihitung.`
      });
    }

    const laporan = laporanSnapshot.docs[0].data();

    // Fetch associated SiklusTanam
    const sDoc = await SiklusTanam.doc(String(siklus_id)).get();
    let siklus_tanam = null;
    if (sDoc.exists) {
      const s = sDoc.data();
      siklus_tanam = {
        id: s.id,
        nama: s.nama,
        tanaman: s.tanaman,
        tanggal_mulai: s.tanggal_mulai,
        tanggal_selesai: s.tanggal_selesai,
        hasil_panen: s.hasil_panen,
        status: s.status
      };
    }

    const hasil_panen = parseFloat(siklus_tanam?.hasil_panen) || 0;
    const total_biaya = parseFloat(laporan.total_biaya) || 0;
    const total_pendapatan = parseFloat(laporan.total_pendapatan) || 0;
    const harga_jual = hasil_panen > 0 ? total_pendapatan / hasil_panen : 0;
    const bep_volume = harga_jual > 0 ? total_biaya / harga_jual : 0;
    const bep_omset = bep_volume * harga_jual;

    res.status(200).json({
      success: true,
      data: {
        ...laporan,
        siklus_tanam,
        bep_volume: parseFloat(bep_volume.toFixed(2)),
        bep_omset: parseFloat(bep_omset.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Melakukan kalkulasi HPP dan proyeksi finansial lalu menyimpannya ke database
 * POST /api/laporan-keuangan/:siklus_id/hitung
 */
exports.hitungLaporan = async (req, res, next) => {
  try {
    const { siklus_id } = req.params;
    const { harga_jual_estimasi, hasil_panen } = req.body;

    if (harga_jual_estimasi === undefined || isNaN(parseFloat(harga_jual_estimasi))) {
      return res.status(400).json({
        success: false,
        message: 'Parameter harga_jual_estimasi wajib berupa angka desimal.'
      });
    }

    // 1. Dapatkan Siklus Tanam
    const sDoc = await SiklusTanam.doc(String(siklus_id)).get();
    if (!sDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
      });
    }
    let siklus = sDoc.data();

    // Jika hasil_panen dikirimkan di body request, perbarui di SiklusTanam
    if (hasil_panen !== undefined && !isNaN(parseFloat(hasil_panen)) && parseFloat(hasil_panen) > 0) {
      const updatedHasilPanen = parseFloat(hasil_panen);
      await SiklusTanam.doc(String(siklus_id)).update({
        hasil_panen: updatedHasilPanen,
        updatedAt: new Date().toISOString()
      });
      siklus.hasil_panen = updatedHasilPanen;
    }

    // 2. Hitung total biaya produksi
    const biayaSnapshot = await BiayaProduksi.where('siklus_id', '==', String(siklus_id)).get();
    let totalBiaya = 0;
    biayaSnapshot.forEach(doc => {
      totalBiaya += parseFloat(doc.data().jumlah) || 0;
    });

    // 3. Jalankan kalkulasi finansial
    const hasilPanen = siklus.hasil_panen || 0;
    const calc = calculateHPPAndProfit(totalBiaya, hasilPanen, harga_jual_estimasi);

    // 4. Update atau Create Laporan Keuangan
    const reportData = {
      siklus_id: String(siklus_id),
      total_pendapatan: calc.total_pendapatan,
      total_biaya: calc.total_biaya,
      keuntungan: calc.keuntungan,
      hpp: calc.hpp,
      tanggal_laporan: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingSnapshot = await LaporanKeuangan.where('siklus_id', '==', String(siklus_id)).limit(1).get();
    let docRef;

    if (!existingSnapshot.empty) {
      docRef = LaporanKeuangan.doc(existingSnapshot.docs[0].id);
      await docRef.update(reportData);
    } else {
      docRef = LaporanKeuangan.doc();
      await docRef.set({
        id: docRef.id,
        ...reportData,
        createdAt: new Date().toISOString()
      });
    }

    const updatedDoc = await docRef.get();

    res.status(200).json({
      success: true,
      message: 'Kalkulasi HPP dan laporan keuangan berhasil disimpan.',
      data: {
        ...updatedDoc.data(),
        bep_volume: calc.bep_volume,
        bep_omset: calc.bep_omset
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mengekspor laporan keuangan siklus tanam ke dokumen PDF
 * GET /api/laporan-keuangan/:siklus_id/export-pdf
 */
exports.exportPdf = async (req, res, next) => {
  try {
    const { siklus_id } = req.params;

    // Mengambil data siklus tanam
    const sDoc = await SiklusTanam.doc(String(siklus_id)).get();
    if (!sDoc.exists) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
      });
    }
    const siklus = sDoc.data();

    // Fetch related biaya_produksi
    const biayaSnapshot = await BiayaProduksi.where('siklus_id', '==', String(siklus_id)).get();
    const biayaList = [];
    biayaSnapshot.forEach(doc => {
      biayaList.push(doc.data());
    });

    // Fetch related laporan_keuangan
    const laporanSnapshot = await LaporanKeuangan.where('siklus_id', '==', String(siklus_id)).limit(1).get();
    const laporan = laporanSnapshot.empty ? null : laporanSnapshot.docs[0].data();

    // Inisialisasi dokumen PDFKit
    const doc = new PDFDocument({ margin: 50 });

    // Set header agar diunduh sebagai file PDF
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_Keuangan_Siklus_${siklus_id}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Hubungkan PDFKit ke stream response Express
    doc.pipe(res);

    // KOP Dokumen
    doc.fontSize(20).text('PANTAU TANI DEMPLOT', { align: 'center', bold: true });
    doc.fontSize(10).text('Modul Manajemen Operasional & Akuntansi Usaha Tani', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#4caf50').lineWidth(2).stroke();
    doc.moveDown(1.5);

    // Rangkuman Informasi Siklus
    doc.fontSize(14).text('Laporan Hasil Panen & Keuangan', { bold: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Nama Siklus Tanam  : ${siklus.nama}`);
    doc.text(`Komoditas Tanaman  : ${siklus.tanaman || '-'}`);
    doc.text(`Tanggal Penanaman  : ${new Date(siklus.tanggal_mulai).toLocaleDateString('id-ID')}`);
    doc.text(`Tanggal Pemanenan  : ${siklus.tanggal_selesai ? new Date(siklus.tanggal_selesai).toLocaleDateString('id-ID') : 'Belum Selesai'}`);
    doc.text(`Status Operasional : ${siklus.status.toUpperCase()}`);
    doc.moveDown(1.5);

    // Hasil Kalkulasi Finansial (HPP)
    doc.fontSize(14).text('Analisis Harga Pokok Produksi (HPP) & BEP', { bold: true });
    doc.moveDown(0.5);
    
    const totalBiaya = biayaList.reduce((sum, b) => sum + parseFloat(b.jumlah), 0);
    const hasilPanen = parseFloat(siklus.hasil_panen) || 0;

    const kategoriBreakdown = {
      'Benih': 0,
      'Pupuk': 0,
      'Pestisida': 0,
      'Tenaga Kerja': 0,
      'Sewa Alat': 0,
      'Lainnya': 0
    };
    biayaList.forEach(biaya => {
      const cat = biaya.kategori;
      if (kategoriBreakdown[cat] !== undefined) {
        kategoriBreakdown[cat] += parseFloat(biaya.jumlah);
      } else {
        kategoriBreakdown['Lainnya'] += parseFloat(biaya.jumlah);
      }
    });

    if (laporan) {
      const total_biaya = parseFloat(laporan.total_biaya) || 0;
      const total_pendapatan = parseFloat(laporan.total_pendapatan) || 0;
      const harga_jual = hasilPanen > 0 ? total_pendapatan / hasilPanen : 0;
      const bep_volume = harga_jual > 0 ? total_biaya / harga_jual : 0;
      const bep_omset = bep_volume * harga_jual;

      doc.fontSize(10);
      doc.text(`• Total Hasil Panen      : ${hasilPanen} kg`);
      doc.text(`• Total Biaya Operasional : Rp ${total_biaya.toLocaleString('id-ID')}`);
      doc.text(`• HPP per Kilogram (kg)   : Rp ${parseFloat(laporan.hpp).toLocaleString('id-ID')} / kg`, { bold: true });
      doc.text(`• Estimasi Harga Jual    : Rp ${Math.round(harga_jual).toLocaleString('id-ID')} / kg`);
      doc.text(`• BEP Volume (kg)         : ${parseFloat(bep_volume.toFixed(2)).toLocaleString('id-ID')} kg`);
      doc.text(`• BEP Omset (Rp)          : Rp ${parseFloat(bep_omset.toFixed(2)).toLocaleString('id-ID')}`);
      doc.text(`• Estimasi Pendapatan    : Rp ${total_pendapatan.toLocaleString('id-ID')}`);
      doc.text(`• Proyeksi Keuntungan    : Rp ${parseFloat(laporan.keuntungan).toLocaleString('id-ID')}`, { bold: true });
    } else {
      doc.fontSize(10).text('Kalkulasi HPP belum dihitung. Silakan lakukan perhitungan di modul akuntansi.');
    }
    doc.moveDown(1.5);

    // Kategori Alokasi Biaya
    doc.fontSize(14).text('Laba Rugi - Rincian Alokasi Biaya Kategori', { bold: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    Object.keys(kategoriBreakdown).forEach((cat) => {
      doc.text(`• Kategori ${cat.padEnd(15)} : Rp ${kategoriBreakdown[cat].toLocaleString('id-ID')}`);
    });
    doc.moveDown(1.5);

    // Daftar Transaksi Biaya
    doc.fontSize(14).text('Rincian Pembiayaan Operasional', { bold: true });
    doc.moveDown(0.5);

    if (biayaList.length > 0) {
      let currentY = doc.y;
      doc.fontSize(10);
      doc.text('Kategori Pengeluaran', 50, currentY, { bold: true });
      doc.text('Tanggal Transaksi', 250, currentY, { bold: true });
      doc.text('Jumlah Biaya', 420, currentY, { align: 'right', bold: true });
      doc.moveTo(50, currentY + 15).lineTo(550, currentY + 15).strokeColor('#ccc').lineWidth(1).stroke();
      
      let nextY = currentY + 25;
      biayaList.forEach((biaya) => {
        doc.text(biaya.kategori, 50, nextY);
        doc.text(new Date(biaya.tanggal).toLocaleDateString('id-ID'), 250, nextY);
        doc.text(`Rp ${parseFloat(biaya.jumlah).toLocaleString('id-ID')}`, 420, nextY, { align: 'right' });
        nextY += 20;

        // Auto Page break
        if (nextY > 700) {
          doc.addPage();
          nextY = 50;
        }
      });

      // Total Row Line
      doc.moveTo(50, nextY + 2).lineTo(550, nextY + 2).strokeColor('#4caf50').lineWidth(1.5).stroke();
      nextY += 12;
      doc.fontSize(10);
      doc.text('TOTAL PEMBIAYAAN OPERASIONAL', 50, nextY, { bold: true });
      doc.text(`Rp ${totalBiaya.toLocaleString('id-ID')}`, 420, nextY, { align: 'right', bold: true });
    } else {
      doc.fontSize(10).text('Belum ada rincian transaksi pengeluaran biaya.');
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
