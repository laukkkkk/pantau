const { db, SiklusTanam, ProfilLahan, Bedeng, SensorData, BiayaProduksi, JadwalKegiatan } = require('../models');

async function seed() {
  console.log('--- START SEEDING FIRESTORE ---');
  try {
    // 1. Seed siklus_tanam
    const activeSiklus = {
      id: '1',
      nama: 'Siklus Tanam Utama 2026',
      tanggal_mulai: new Date('2026-05-01T00:00:00Z').toISOString(),
      tanggal_selesai: null,
      hasil_panen: null,
      status: 'AKTIF',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await SiklusTanam.doc('1').set(activeSiklus);
    console.log('✓ Siklus tanam seeded.');

    // 2. Seed profil_lahan
    const minLat = -6.71285;
    const maxLat = -6.71265;
    const minLng = 106.85368;
    const maxLng = 106.85388;

    const profilLahan = {
      id: '1',
      nama: 'Demplot Utama Ormawa',
      koordinat_center: {
        type: 'Point',
        coordinates: [-6.71275, 106.853778]
      },
      polygon_batas: JSON.stringify({
        type: 'Polygon',
        coordinates: [[
          [minLat, minLng],
          [maxLat, minLng],
          [maxLat, maxLng],
          [minLat, maxLng],
          [minLat, minLng]
        ]]
      }),
      luas: 400.00,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await ProfilLahan.doc('1').set(profilLahan);
    console.log('✓ Profil lahan seeded.');

    // 3. Seed 16 Bedeng
    const latStep = (maxLat - minLat) / 4;
    const lngStep = (maxLng - minLng) / 4;

    let bedengNo = 1;
    const batch = db.batch();

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const bMinLat = minLat + r * latStep;
        const bMaxLat = bMinLat + latStep;
        const bMinLng = minLng + c * lngStep;
        const bMaxLng = bMinLng + lngStep;

        const polygon_batas = JSON.stringify({
          type: 'Polygon',
          coordinates: [[
            [bMinLat, bMinLng],
            [bMaxLat, bMinLng],
            [bMaxLat, bMaxLng],
            [bMinLat, bMaxLng],
            [bMinLat, bMinLng]
          ]]
        });

        const bedengData = {
          id: String(bedengNo),
          nomor_bedeng: bedengNo,
          nama: `Bedeng ${bedengNo}`,
          polygon_batas,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = Bedeng.doc(String(bedengNo));
        batch.set(docRef, bedengData);
        bedengNo++;
      }
    }
    await batch.commit();
    console.log('✓ 16 Bedengs seeded.');

    // 4. Seed sensor_data
    const sensorRecords = [
      {
        id: '1',
        kelembaban: 78.5,
        pH: 6.5,
        bedeng_id: '1',
        timestamp: new Date('2026-07-15T08:00:00Z').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        kelembaban: 80.2,
        pH: 6.4,
        bedeng_id: '1',
        timestamp: new Date('2026-07-15T09:00:00Z').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        kelembaban: 79.1,
        pH: 6.5,
        bedeng_id: '1',
        timestamp: new Date('2026-07-15T10:00:00Z').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const record of sensorRecords) {
      await SensorData.doc(record.id).set(record);
    }
    console.log('✓ Sensor data seeded.');

    // 5. Seed biaya_produksi
    const biayaRecords = [
      {
        id: '1',
        kategori: 'Pupuk',
        deskripsi: 'Pupuk Urea',
        jumlah: 150000.00,
        tanggal: new Date('2026-05-10T00:00:00Z').toISOString(),
        siklus_id: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        kategori: 'Benih',
        deskripsi: 'Bibit Padi Pandanwangi',
        jumlah: 250000.00,
        tanggal: new Date('2026-05-02T00:00:00Z').toISOString(),
        siklus_id: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const record of biayaRecords) {
      await BiayaProduksi.doc(record.id).set(record);
    }
    console.log('✓ Biaya produksi seeded.');

    // 6. Seed jadwal_kegiatan
    const jadwalRecords = [
      {
        id: '1',
        nama_kegiatan: 'Penyemaian Benih Padi',
        tanggal: new Date('2026-05-01T08:00:00Z').toISOString(),
        status: 'SELESAI',
        deskripsi: 'Menabur benih padi Pandanwangi di bedengan semai basah.',
        kategori: 'Tani',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        nama_kegiatan: 'Pemupukan Susulan Urea',
        tanggal: new Date('2026-07-20T08:00:00Z').toISOString(),
        status: 'BELUM_MULAI',
        deskripsi: 'Pemberian pupuk Urea dosis 50kg per hektar untuk mempercepat pertumbuhan anakan.',
        kategori: 'Tani',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        nama_kegiatan: 'Rapat Pleno Koordinasi Ormawa',
        tanggal: new Date('2026-07-18T14:00:00Z').toISOString(),
        status: 'BELUM_MULAI',
        deskripsi: 'Rapat koordinasi internal Ormawa membahas progress program pendampingan demplot.',
        kategori: 'Ormawa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        nama_kegiatan: 'Sosialisasi Aplikasi Pantau ke Petani',
        tanggal: new Date('2026-05-05T09:00:00Z').toISOString(),
        status: 'SELESAI',
        deskripsi: 'Pemberian edukasi penggunaan aplikasi Pantau kepada perwakilan kelompok tani Caringin.',
        kategori: 'Ormawa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const record of jadwalRecords) {
      await JadwalKegiatan.doc(record.id).set(record);
    }
    console.log('✓ Jadwal kegiatan seeded.');

    console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding Firestore:', error.message);
    process.exit(1);
  }
}

seed();
