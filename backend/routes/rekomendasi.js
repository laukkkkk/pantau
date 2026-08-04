const express = require('express');
const router = express.Router();
const rekomendasiController = require('../controllers/rekomendasiController');

router.get('/rekomendasi-pupuk', rekomendasiController.getRekomendasi);
router.post('/rekomendasi-pupuk', rekomendasiController.createRekomendasi);
router.patch('/rekomendasi-pupuk/:id', rekomendasiController.updateRekomendasi);
router.delete('/rekomendasi-pupuk/:id', rekomendasiController.deleteRekomendasi);

module.exports = router;
