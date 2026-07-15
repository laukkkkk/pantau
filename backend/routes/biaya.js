const express = require('express');
const router = express.Router();
const biayaController = require('../controllers/biayaController');

router.post('/biaya-produksi', biayaController.createBiaya);
router.get('/biaya-produksi', biayaController.getAllBiaya);
router.put('/biaya-produksi/:id', biayaController.updateBiaya);
router.delete('/biaya-produksi/:id', biayaController.deleteBiaya);

module.exports = router;
