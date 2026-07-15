const express = require('express');
const router = express.Router();
const rekomendasiController = require('../controllers/rekomendasiController');

router.get('/rekomendasi-pupuk', rekomendasiController.getRekomendasi);
router.post('/rekomendasi-pupuk', rekomendasiController.createRekomendasi);
router.patch('/rekomendasi-pupuk/:id', rekomendasiController.updateRekomendasi);

module.exports = router;
