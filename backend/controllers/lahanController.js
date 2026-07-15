const { ProfilLahan, Sequelize } = require('../models');
const turf = require('@turf/turf');

/**
 * Membaca profil lahan (demplot tunggal)
 * GET /api/lahan
 */
exports.getLahan = async (req, res, next) => {
  try {
    let lahan = await ProfilLahan.findByPk(1);

    // Defensive: Jika data seeder tidak ada, buat baris default
    if (!lahan) {
      lahan = await ProfilLahan.create({
        id: 1,
        nama: 'Demplot Utama Ormawa',
        koordinat_center: {
          type: 'Point',
          coordinates: [-6.2088, 106.8456]
        },
        polygon_batas: {
          type: 'Polygon',
          coordinates: [[
            [-6.2088, 106.8456],
            [-6.2080, 106.8456],
            [-6.2080, 106.8465],
            [-6.2088, 106.8465],
            [-6.2088, 106.8456]
          ]]
        },
        luas: 1200.50
      });
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

    // Ambil data lahan yang ada
    let lahan = await ProfilLahan.findByPk(1);
    if (!lahan) {
      // Jika belum ada, buat baru
      lahan = await ProfilLahan.create({
        id: 1,
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
        updates.koordinat_center = Sequelize.fn(
          'ST_GeomFromText',
          `POINT(${lat} ${lng})`,
          4326
        );
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

      // Konversi format ring data asli ke WKT Polygon PostGIS
      const wktPolygonPoints = primaryRing
        .map(pt => `${pt[0]} ${pt[1]}`)
        .join(', ');

      updates.polygon_batas = Sequelize.fn(
        'ST_GeomFromText',
        `POLYGON((${wktPolygonPoints}))`,
        4326
      );
    }

    // Lakukan update database
    await lahan.update(updates);

    // Ambil ulang data terupdate agar geometry ter-parse kembali dengan benar
    const updatedLahan = await ProfilLahan.findByPk(1);

    res.status(200).json({
      success: true,
      message: 'Profil lahan berhasil diperbarui.',
      data: updatedLahan
    });
  } catch (error) {
    next(error);
  }
};
