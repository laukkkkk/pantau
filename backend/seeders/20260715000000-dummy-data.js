module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Seed siklus_tanam
    await queryInterface.bulkInsert('siklus_tanam', [{
      id: 1,
      nama: 'Siklus Tanam Utama 2026',
      tanggal_mulai: new Date('2026-05-01T00:00:00Z'),
      tanggal_selesai: null,
      status: 'AKTIF',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // 2. Seed profil_lahan (PostGIS POINT & POLYGON)
    await queryInterface.bulkInsert('profil_lahan', [{
      id: 1,
      nama: 'Demplot Utama Ormawa',
      koordinat_center: Sequelize.fn('ST_GeomFromText', 'POINT(-6.2088 106.8456)', 4326),
      polygon_batas: Sequelize.fn('ST_GeomFromText', 'POLYGON((-6.2088 106.8456, -6.2080 106.8456, -6.2080 106.8465, -6.2088 106.8465, -6.2088 106.8456))', 4326),
      luas: 1200.50,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // 3. Seed sensor_data
    await queryInterface.bulkInsert('sensor_data', [
      {
        id: 1,
        kelembaban: 78.5,
        pH: 6.5,
        N: 45.2,
        P: 32.1,
        K: 60.5,
        timestamp: new Date('2026-07-15T08:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        kelembaban: 80.2,
        pH: 6.4,
        N: 46.1,
        P: 31.8,
        K: 59.9,
        timestamp: new Date('2026-07-15T09:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        kelembaban: 79.1,
        pH: 6.5,
        N: 45.8,
        P: 32.0,
        K: 60.1,
        timestamp: new Date('2026-07-15T10:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // 4. Seed biaya_produksi
    await queryInterface.bulkInsert('biaya_produksi', [
      {
        id: 1,
        kategori: 'Pupuk Urea',
        jumlah: 150000.00,
        tanggal: new Date('2026-05-10T00:00:00Z'),
        siklus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        kategori: 'Bibit Padi Pandanwangi',
        jumlah: 250000.00,
        tanggal: new Date('2026-05-02T00:00:00Z'),
        siklus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Reset sequences in PostgreSQL to prevent ID collisions on subsequent inserts
    try {
      await queryInterface.sequelize.query("SELECT setval(pg_get_serial_sequence('siklus_tanam', 'id'), COALESCE((SELECT MAX(id)+1 FROM siklus_tanam), 1), false);");
      await queryInterface.sequelize.query("SELECT setval(pg_get_serial_sequence('profil_lahan', 'id'), COALESCE((SELECT MAX(id)+1 FROM profil_lahan), 1), false);");
      await queryInterface.sequelize.query("SELECT setval(pg_get_serial_sequence('sensor_data', 'id'), COALESCE((SELECT MAX(id)+1 FROM sensor_data), 1), false);");
      await queryInterface.sequelize.query("SELECT setval(pg_get_serial_sequence('biaya_produksi', 'id'), COALESCE((SELECT MAX(id)+1 FROM biaya_produksi), 1), false);");
    } catch (e) {
      console.warn('Could not reset database sequences (this is expected if not running on PostgreSQL yet):', e.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('biaya_produksi', null, {});
    await queryInterface.bulkDelete('sensor_data', null, {});
    await queryInterface.bulkDelete('profil_lahan', null, {});
    await queryInterface.bulkDelete('siklus_tanam', null, {});
  }
};
