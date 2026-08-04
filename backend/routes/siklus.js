const express = require('express');
const router = express.Router();
const siklusController = require('../controllers/siklusController');

router.post('/siklus-tanam', siklusController.createSiklus);
router.get('/siklus-tanam', siklusController.getAllSiklus);
router.get('/siklus-tanam/:id', siklusController.getSiklusById);
router.put('/siklus-tanam/:id', siklusController.updateSiklus);
router.delete('/siklus-tanam/:id', siklusController.deleteSiklus);

module.exports = router;
