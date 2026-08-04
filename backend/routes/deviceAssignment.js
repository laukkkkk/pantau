const express = require('express');
const router = express.Router();
const deviceAssignmentController = require('../controllers/deviceAssignmentController');

router.get('/device-assignment', deviceAssignmentController.getDeviceAssignments);
router.put('/device-assignment/:deviceId', deviceAssignmentController.updateDeviceAssignment);

module.exports = router;
