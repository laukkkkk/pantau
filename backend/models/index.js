const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
        ? path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : path.resolve(__dirname, '../firebase-service-account.json');
      serviceAccount = require(serviceAccountPath);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
}

const db = admin.firestore();

// Collections
const ProfilLahan = db.collection('profil_lahan');
const SensorData = db.collection('sensor_data');
const DeteksiHama = db.collection('deteksi_hama');
const RekomendasiPupuk = db.collection('rekomendasi_pupuk');
const BiayaProduksi = db.collection('biaya_produksi');
const SiklusTanam = db.collection('siklus_tanam');
const LaporanKeuangan = db.collection('laporan_keuangan');
const JadwalKegiatan = db.collection('jadwal_kegiatan');
const Bedeng = db.collection('bedeng');
const DeviceAssignment = db.collection('device_assignment');

module.exports = {
  db,
  admin,
  ProfilLahan,
  SensorData,
  DeteksiHama,
  RekomendasiPupuk,
  BiayaProduksi,
  SiklusTanam,
  LaporanKeuangan,
  JadwalKegiatan,
  Bedeng,
  DeviceAssignment
};
