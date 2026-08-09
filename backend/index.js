const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./models');
const healthRouter = require('./routes/health');
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables
require('dotenv').config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routing
app.use('/api', healthRouter);
app.use('/api', require('./routes/sensor'));
app.use('/api', require('./routes/biaya'));
app.use('/api', require('./routes/siklus'));
app.use('/api', require('./routes/laporan'));
app.use('/api', require('./routes/lahan'));
app.use('/api', require('./routes/rekomendasi'));
app.use('/api', require('./routes/jadwal'));
app.use('/api', require('./routes/deteksi'));
app.use('/api', require('./routes/dashboard'));
app.use('/api', require('./routes/deviceAssignment'));

// Global Error Handler
app.use(errorHandler);

// Database connection test & server start
const startServer = async () => {
  try {
    // Test connectivity to Firestore
    await db.db.collection('profil_lahan').doc('1').get();
    console.log('✓ Firestore connection has been established successfully.');
    
    // (Firestore connection is verified)
  } catch (error) {
    console.warn('⚠️ Warning: Firestore connection failed. Please check your Firebase credentials.');
    console.error('Connection details:', error.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Express server is running on port ${PORT} (0.0.0.0)`);
    console.log(`✓ Health check endpoint available at http://localhost:${PORT}/api/health`);
  });
};

startServer();
