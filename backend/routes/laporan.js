const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');

router.get('/laporan-keuangan/:siklus_id', laporanController.getLaporanBySiklus);
router.post('/laporan-keuangan/:siklus_id/hitung', laporanController.hitungLaporan);
router.get('/laporan-keuangan/:siklus_id/export-pdf', laporanController.exportPdf);

module.exports = router;
