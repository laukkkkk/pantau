const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

async function generateModulPdf() {
  console.log('--- START GENERATING E-MODUL PDF ---');
  
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const pdfPath = path.join(uploadsDir, 'modul-budidaya-cabai-jawa.pdf');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Header Banner
  doc
    .rect(0, 0, 595.28, 120)
    .fill('#2e7d32');

  doc
    .fillColor('#ffffff')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('E-MODUL BUDIDAYA CABAI JAWA', 50, 35, { align: 'center' });

  doc
    .fontSize(12)
    .font('Helvetica')
    .text('Panduan Praktis Pemeliharaan & Produktivitas Demplot Ormawa', 50, 70, { align: 'center' });

  doc.moveDown(4);

  // Metadata Box
  doc
    .fillColor('#333333')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Komoditas:', 50, 140)
    .font('Helvetica')
    .text('Cabai Jawa (Piper retrofractum Vahl)', 120, 140)
    .font('Helvetica-Bold')
    .text('Lokasi:', 50, 155)
    .font('Helvetica')
    .text('Demplot Desa Pancawati, Caringin, Bogor', 120, 155)
    .font('Helvetica-Bold')
    .text('Penerbit:', 50, 170)
    .font('Helvetica')
    .text('Tim Program Pendampingan Ormawa - Aplikasi Pantau', 120, 170);

  doc
    .moveTo(50, 190)
    .lineTo(545, 190)
    .strokeColor('#cccccc')
    .lineWidth(1)
    .stroke();

  doc.y = 205;

  // Modul Content Steps
  const modules = [
    {
      title: 'Bab 1: Syarat Tumbuh & Karakteristik Lahan',
      body: 'Cabai jawa tumbuh secara optimal pada ketinggian 1 - 600 mdpl dengan suhu udara berkisar antara 25°C hingga 32°C. Jenis tanah yang paling ideal adalah tanah lempung berpasir yang gembur, kaya akan bahan organik, memiliki pH 5.5 - 6.5, serta sistem drainase air yang baik untuk mencegah pembusukan akar.'
    },
    {
      title: 'Bab 2: Persiapan Lahan & Pembukaan Bedengan',
      body: 'Gemburkan tanah dengan pembajakan sedalam 30 cm dan bersihkan dari gulma pengganggu. Buat bedengan dengan lebar 100 cm, tinggi 30 cm, serta lubang tanam berukuran 40x40x40 cm. Berikan pupuk kandang matang sebanyak 5 - 10 kg per lubang tanam sebagai pupuk dasar sebelum bibit dipindahkan.'
    },
    {
      title: 'Bab 3: Teknik Penyemaian & Penanaman',
      body: 'Perbanyakan tanaman cabai jawa paling efektif menggunakan stek batang dengan minimal 3 - 5 buku daun. Semai stek di dalam polybag persemaian selama 1 - 2 bulan hingga mengakar kuat. Pindahkan bibit yang sehat ke bedengan lahan utama dengan jarak tanam ideal 1 meter x 1 meter.'
    },
    {
      title: 'Bab 4: Pemeliharaan, Penyiangan & Tiang Panjat',
      body: 'Karena cabai jawa merupakan tanaman merambat, wajib disiapkan tiang panjat (anjir) berupa kayu atau bambu setinggi 2 meter di dekat tiap lubang tanam. Lakukan penyiangan gulma berkala, penyiraman yang stabil di pagi/sore hari, dan pemangkasan daun bawah untuk menjaga sirkulasi udara.'
    },
    {
      title: 'Bab 5: Dosis & Jadwal Pemupukan Susulan',
      body: 'Gunakan pupuk NPK (15-15-15) susulan secara berkala. Pemupukan susulan pertama dilakukan pada umur 1 bulan setelah tanam (dosis 10-15 gram per tanaman), dan diulangi setiap 3-4 bulan sekali dengan meningkatkan dosis bertahap sesuai petunjuk rekomendasi sistem IoT Pantau.'
    },
    {
      title: 'Bab 6: Pemanenan & Penanganan Pasca Panen',
      body: 'Buah cabai jawa siap dipanen apabila telah berwarna merah tua kehitaman (matang sempurna). Petik buah beserta gagangnya pada pagi hari, cuci hingga bersih, lalu jemur di bawah sinar matahari langsung selama 3 - 5 hari hingga kadar air di bawah 10% agar memiliki daya simpan yang panjang.'
    }
  ];

  modules.forEach((mod) => {
    if (doc.y > 700) {
      doc.addPage();
      doc.y = 50;
    }

    doc
      .fillColor('#2e7d32')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(mod.title);

    doc.moveDown(0.3);

    doc
      .fillColor('#444444')
      .fontSize(10)
      .font('Helvetica')
      .text(mod.body, { align: 'justify', lineGap: 3 });

    doc.moveDown(1.2);
  });

  // Footer
  doc
    .fontSize(8)
    .fillColor('#888888')
    .text('© 2026 Tim PPK Ormawa - Aplikasi Pantau Demplot Tani. All Rights Reserved.', 50, 780, { align: 'center' });

  doc.end();

  stream.on('finish', () => {
    console.log(`✓ Berhasil mempublikasikan E-Modul PDF di: ${pdfPath}`);
    process.exit(0);
  });
}

generateModulPdf().catch((err) => {
  console.error('✗ Error generating PDF:', err.message);
  process.exit(1);
});
