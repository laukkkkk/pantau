const express = require('express');
const router = express.Router();
const db = require('../models');

router.get('/health', async (req, res) => {
  let dbStatus = 'ONLINE';
  let dbError = null;

  try {
    await db.sequelize.authenticate();
  } catch (error) {
    dbStatus = 'OFFLINE';
    dbError = error.message;
  }

  const statusCode = dbStatus === 'ONLINE' ? 200 : 503;

  res.status(statusCode).json({
    status: 'UP',
    timestamp: new Date(),
    services: {
      server: 'ONLINE',
      database: {
        status: dbStatus,
        error: dbError
      }
    }
  });
});

module.exports = router;
