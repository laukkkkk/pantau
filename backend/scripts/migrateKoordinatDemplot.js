const { db, ProfilLahan, Bedeng } = require('../models');

async function migrateKoordinatDemplot() {
  console.log('--- START MIGRATION: Update Koordinat Demplot Desa Pancawati ---');
  try {
    const centerLat = -6.71275;
    const centerLng = 106.853778;

    const minLat = -6.71285;
    const maxLat = -6.71265;
    const minLng = 106.85368;
    const maxLng = 106.85388;

    // 1. Update profil_lahan
    const lahanDocRef = ProfilLahan.doc('1');
    const lahanDoc = await lahanDocRef.get();
    
    const polygon_lahan = JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [minLat, minLng],
        [maxLat, minLng],
        [maxLat, maxLng],
        [minLat, maxLng],
        [minLat, minLng]
      ]]
    });

    if (lahanDoc.exists) {
      await lahanDocRef.update({
        koordinat_center: {
          type: 'Point',
          coordinates: [centerLat, centerLng]
        },
        polygon_batas: polygon_lahan,
        updatedAt: new Date().toISOString()
      });
      console.log('✓ Document profil_lahan (1) berhasil di-update ke Desa Pancawati.');
    } else {
      await lahanDocRef.set({
        id: '1',
        nama: 'Demplot Utama Ormawa',
        koordinat_center: {
          type: 'Point',
          coordinates: [centerLat, centerLng]
        },
        polygon_batas: polygon_lahan,
        luas: 400.00,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('✓ Document profil_lahan (1) baru dibuat di Desa Pancawati.');
    }

    // 2. Update 16 Bedeng
    const latStep = (maxLat - minLat) / 4;
    const lngStep = (maxLng - minLng) / 4;

    const batch = db.batch();
    let bedengNo = 1;

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

        const docRef = Bedeng.doc(String(bedengNo));
        batch.set(docRef, {
          id: String(bedengNo),
          nomor_bedeng: bedengNo,
          nama: `Bedeng ${bedengNo}`,
          polygon_batas,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        bedengNo++;
      }
    }

    await batch.commit();
    console.log('✓ 16 Dokumen Bedeng di Firestore berhasil di-update koordinatnya ke Desa Pancawati.');
    console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error saat migrasi koordinat demplot:', error.message);
    process.exit(1);
  }
}

migrateKoordinatDemplot();
