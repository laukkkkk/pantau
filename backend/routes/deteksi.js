const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const deteksiController = require('../controllers/deteksiController');

// Menggunakan disk storage untuk menyimpan berkas fisik secara lokal di folder /uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const cleanedName = file.originalname.replace(/\s+/g, '_');
    cb(null, `deteksi_${uniqueSuffix}_${cleanedName}`);
  }
});

const upload = multer({ storage: storage });

router.post('/deteksi-hama', upload.single('file'), deteksiController.createDeteksi);
router.get('/deteksi-hama', deteksiController.getDeteksiList);
router.get('/deteksi-hama/:id', deteksiController.getDeteksiById);
router.delete('/deteksi-hama/:id', deteksiController.deleteDeteksi);

module.exports = router;
