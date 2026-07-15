const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./models');
const healthRouter = require('./routes/health');
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routing
app.use('/api', healthRouter);

// Global Error Handler
app.use(errorHandler);

// Database connection test & server start
const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✓ Database connection has been established successfully.');
  } catch (error) {
    console.warn('⚠️ Warning: Database connection failed. Please check your DB_URL in .env.');
    console.error('Connection details:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`✓ Express server is running on port ${PORT}`);
    console.log(`✓ Health check endpoint available at http://localhost:${PORT}/api/health`);
  });
};

startServer();
