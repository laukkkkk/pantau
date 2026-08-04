const { db, Bedeng } = require('../models');

async function migrateBedengNama() {
  console.log('--- START MIGRATION: Populate Bedeng Nama ---');
  try {
    const snapshot = await Bedeng.get();
    if (snapshot.empty) {
      console.log('Tidak ada dokumen bedeng ditemukan.');
      process.exit(0);
    }

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.nama || data.nama.trim() === '') {
        const bedengNama = `Bedeng ${data.nomor_bedeng || doc.id}`;
        batch.update(doc.ref, {
          nama: bedengNama,
          updatedAt: new Date().toISOString()
        });
        console.log(`- Document ID ${doc.id}: nama di-update menjadi "${bedengNama}"`);
        updatedCount++;
      } else {
        console.log(`- Document ID ${doc.id}: sudah memiliki nama "${data.nama}"`);
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✓ Berhasil memperbarui ${updatedCount} dokumen bedeng.`);
    } else {
      console.log('✓ Seluruh dokumen bedeng sudah memiliki atribut nama.');
    }

    console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error saat migrasi bedeng nama:', error.message);
    process.exit(1);
  }
}

migrateBedengNama();
