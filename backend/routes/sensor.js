const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

router.post('/sensor-data', sensorController.createSensorData);
router.get('/sensor-data', sensorController.getSensorData);
router.get('/sensor-data/latest', sensorController.getLatestSensorData);

module.exports = router;
