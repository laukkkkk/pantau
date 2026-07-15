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

    const laporan = await LaporanKeuangan.findOne({
      where: { siklus_id: parseInt(siklus_id) },
      include: [
        {
          model: SiklusTanam,
          as: 'siklus_tanam',
          attributes: ['id', 'nama', 'tanaman', 'tanggal_mulai', 'tanggal_selesai', 'hasil_panen', 'status']
        }
      ]
    });

    if (!laporan) {
      return res.status(404).json({
        success: false,
        message: `Laporan keuangan untuk siklus ID ${siklus_id} belum dihitung.`
      });
    }

    res.status(200).json({
      success: true,
      data: laporan
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
    const { harga_jual_estimasi } = req.body;

    if (harga_jual_estimasi === undefined || isNaN(parseFloat(harga_jual_estimasi))) {
      return res.status(400).json({
        success: false,
        message: 'Parameter harga_jual_estimasi wajib berupa angka desimal.'
      });
    }

    // 1. Dapatkan Siklus Tanam
    const siklus = await SiklusTanam.findByPk(siklus_id);
    if (!siklus) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
      });
    }

    // 2. Hitung total biaya produksi
    const totalBiaya = await BiayaProduksi.sum('jumlah', {
      where: { siklus_id: parseInt(siklus_id) }
    }) || 0;

    // 3. Jalankan kalkulasi finansial
    const hasilPanen = siklus.hasil_panen || 0;
    const calc = calculateHPPAndProfit(totalBiaya, hasilPanen, harga_jual_estimasi);

    // 4. Update atau Create Laporan Keuangan
    let laporan = await LaporanKeuangan.findOne({
      where: { siklus_id: parseInt(siklus_id) }
    });

    const reportData = {
      siklus_id: parseInt(siklus_id),
      total_pendapatan: calc.total_pendapatan,
      total_biaya: calc.total_biaya,
      keuntungan: calc.keuntungan,
      hpp: calc.hpp,
      tanggal_laporan: new Date()
    };

    if (laporan) {
      await laporan.update(reportData);
    } else {
      laporan = await LaporanKeuangan.create(reportData);
    }

    res.status(200).json({
      success: true,
      message: 'Kalkulasi HPP dan laporan keuangan berhasil disimpan.',
      data: laporan
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

    // Mengambil siklus tanam, laporan keuangan, dan rincian biaya
    const siklus = await SiklusTanam.findByPk(siklus_id, {
      include: [
        {
          model: BiayaProduksi,
          as: 'biaya_produksi'
        },
        {
          model: LaporanKeuangan,
          as: 'laporan_keuangan'
        }
      ]
    });

    if (!siklus) {
      return res.status(404).json({
        success: false,
        message: `Siklus tanam dengan ID ${siklus_id} tidak ditemukan.`
      });
    }

    const laporan = siklus.laporan_keuangan && siklus.laporan_keuangan.length > 0
      ? siklus.laporan_keuangan[0]
      : null;

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
    doc.fontSize(14).text('Analisis Harga Pokok Produksi (HPP)', { bold: true });
    doc.moveDown(0.5);
    
    if (laporan) {
      doc.fontSize(10);
      doc.text(`• Total Hasil Panen      : ${siklus.hasil_panen || 0} kg`);
      doc.text(`• Total Biaya Operasional : Rp ${parseFloat(laporan.total_biaya).toLocaleString('id-ID')}`);
      doc.text(`• HPP per Kilogram (kg)   : Rp ${parseFloat(laporan.hpp).toLocaleString('id-ID')} / kg`, { bold: true });
      doc.text(`• Estimasi Pendapatan    : Rp ${parseFloat(laporan.total_pendapatan).toLocaleString('id-ID')}`);
      doc.text(`• Proyeksi Keuntungan    : Rp ${parseFloat(laporan.keuntungan).toLocaleString('id-ID')}`, { bold: true });
    } else {
      doc.fontSize(10).text('Kalkulasi HPP belum dihitung. Jalankan fungsi hitung laporan terlebih dahulu.');
    }
    doc.moveDown(1.5);

    // Daftar Transaksi Biaya
    doc.fontSize(14).text('Rincian Pembiayaan Operasional', { bold: true });
    doc.moveDown(0.5);

    const biayaList = siklus.biaya_produksi || [];
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
    } else {
      doc.fontSize(10).text('Belum ada rincian transaksi pengeluaran biaya.');
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
