const express = require('express');
const router = express.Router();
const lahanController = require('../controllers/lahanController');

router.get('/lahan', lahanController.getLahan);
router.put('/lahan', lahanController.updateLahan);
router.get('/bedeng', lahanController.getBedengList);

module.exports = router;
