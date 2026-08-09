const express = require('express');
const router = express.Router();
const multer = require('multer');
const deteksiController = require('../controllers/deteksiController');

// Menggunakan memory storage karena file akan langsung diunggah ke Firebase Storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/deteksi-hama', upload.single('file'), deteksiController.createDeteksi);
router.get('/deteksi-hama', deteksiController.getDeteksiList);
router.get('/deteksi-hama/:id', deteksiController.getDeteksiById);
router.delete('/deteksi-hama/:id', deteksiController.deleteDeteksi);

module.exports = router;
