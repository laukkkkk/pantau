const express = require('express');
const router = express.Router();
const jadwalController = require('../controllers/jadwalController');

router.get('/jadwal-kegiatan', jadwalController.getJadwal);
router.post('/jadwal-kegiatan', jadwalController.createJadwal);
router.patch('/jadwal-kegiatan/:id', jadwalController.updateJadwal);
router.delete('/jadwal-kegiatan/:id', jadwalController.deleteJadwal);

module.exports = router;
