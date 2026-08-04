const { ProfilLahan, Bedeng, SensorData } = require('../models');
const turf = require('@turf/turf');

/**
 * Membaca profil lahan (demplot tunggal)
 * GET /api/lahan
 */
exports.getLahan = async (req, res, next) => {
  try {
    const docRef = ProfilLahan.doc('1');
    const doc = await docRef.get();

    let lahan;
    // Defensive: Jika data seeder tidak ada, buat baris default
    if (!doc.exists) {
      lahan = {
        id: '1',
        nama: 'Demplot Utama Ormawa',
        koordinat_center: {
          type: 'Point',
          coordinates: [-6.71275, 106.853778]
        },
        polygon_batas: JSON.stringify({
          type: 'Polygon',
          coordinates: [[
            [-6.71285, 106.85368],
            [-6.71265, 106.85368],
            [-6.71265, 106.85388],
            [-6.71285, 106.85388],
            [-6.71285, 106.85368]
          ]]
        }),
        luas: 400.00
      };
      await docRef.set(lahan);
    } else {
      lahan = doc.data();
    }

    if (lahan && lahan.polygon_batas && typeof lahan.polygon_batas === 'string') {
      lahan.polygon_batas = JSON.parse(lahan.polygon_batas);
    }

    res.status(200).json({
      success: true,
      data: lahan
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Memperbarui koordinat center, polygon batas, dan otomatis menghitung luas lahan dengan Turf.js
 * PUT /api/lahan
 */
exports.updateLahan = async (req, res, next) => {
  try {
    const { nama, koordinat_center, polygon_batas } = req.body;

    const docRef = ProfilLahan.doc('1');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // Jika belum ada, buat baru
      await docRef.set({
        id: '1',
        nama: nama || 'Demplot Utama Ormawa',
        luas: 0
      });
    }

    const updates = {};
    if (nama) {
      updates.nama = nama;
    }

    // 1. Proses koordinat center
    if (koordinat_center) {
      let lat, lng;
      if (Array.isArray(koordinat_center)) {
        lat = koordinat_center[0];
        lng = koordinat_center[1];
      } else if (koordinat_center.latitude !== undefined) {
        lat = koordinat_center.latitude;
        lng = koordinat_center.longitude;
      } else if (koordinat_center.lat !== undefined) {
        lat = koordinat_center.lat;
        lng = koordinat_center.lng;
      }

      if (lat !== undefined && lng !== undefined) {
        updates.koordinat_center = {
          type: 'Point',
          coordinates: [parseFloat(lat), parseFloat(lng)]
        };
      }
    }

    // 2. Proses polygon batas & Hitung Luas dengan Turf.js
    if (polygon_batas) {
      let rings = polygon_batas;
      
      // Validasi & parsing struktur array coordinates
      if (Array.isArray(rings) && rings.length > 0) {
        if (!Array.isArray(rings[0][0])) {
          // Jika format 2D [[lat, lng], [lat, lng]], ubah jadi 3D [[[lat, lng], ...]]
          rings = [rings];
        }
      }

      // Pastikan loop polygon tertutup (titik pertama = titik terakhir)
      const primaryRing = rings[0];
      if (primaryRing && primaryRing.length > 0) {
        const first = primaryRing[0];
        const last = primaryRing[primaryRing.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          primaryRing.push([first[0], first[1]]);
        }
      }

      // Hitung luas: Turf.js butuh koordinat berurutan [lng, lat]
      // Lakukan mapping penukaran posisi dari [lat, lng] -> [lng, lat] untuk Turf
      const turfRings = rings.map(ring => 
        ring.map(pt => [parseFloat(pt[1]), parseFloat(pt[0])])
      );

      const turfPoly = turf.polygon(turfRings);
      const calculatedArea = turf.area(turfPoly); // dalam satuan meter persegi (m²)
      updates.luas = parseFloat(calculatedArea.toFixed(2));

      updates.polygon_batas = JSON.stringify({
        type: 'Polygon',
        coordinates: rings
      });
    }

    // Lakukan update database
    await docRef.update(updates);

    // Ambil ulang data terupdate
    const updatedDoc = await docRef.get();
    const updatedLahan = updatedDoc.data();
    if (updatedLahan && updatedLahan.polygon_batas && typeof updatedLahan.polygon_batas === 'string') {
      updatedLahan.polygon_batas = JSON.parse(updatedLahan.polygon_batas);
    }

    res.status(200).json({
      success: true,
      message: 'Profil lahan berhasil diperbarui.',
      data: updatedLahan
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mendapatkan daftar seluruh bedeng beserta data sensor terbarunya
 * GET /api/bedeng
 */
exports.getBedengList = async (req, res, next) => {
  try {
    const snapshot = await Bedeng.orderBy('nomor_bedeng', 'asc').get();
    const list = [];
    snapshot.forEach(doc => {
      const bData = doc.data();
      if (!bData.nama) {
        bData.nama = `Bedeng ${bData.nomor_bedeng || doc.id}`;
      }
      if (bData.polygon_batas && typeof bData.polygon_batas === 'string') {
        bData.polygon_batas = JSON.parse(bData.polygon_batas);
      }
      list.push(bData);
    });

    const dataWithLatestSensor = await Promise.all(
      list.map(async (bedeng) => {
        // Fetch all sensor logs for this bedeng and select latest in-memory to avoid requiring composite index
        const sensorSnapshot = await SensorData
          .where('bedeng_id', 'in', [bedeng.id, parseInt(bedeng.id)])
          .get();

        let latestSensor = null;
        if (!sensorSnapshot.empty) {
          const sensors = [];
          sensorSnapshot.forEach(doc => {
            sensors.push(doc.data());
          });
          // Sort by timestamp desc
          sensors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          latestSensor = sensors[0];
        }

        return {
          ...bedeng,
          latest_sensor: latestSensor
        };
      })
    );

    res.status(200).json({
      success: true,
      data: dataWithLatestSensor
    });
  } catch (error) {
    next(error);
  }
};
