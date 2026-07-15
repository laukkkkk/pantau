import axios from 'axios';
import { Platform } from 'react-native';

// Android Emulator connects to localhost via 10.0.2.2
// iOS Simulator and Web connect directly to localhost (or custom IP)
const getBaseUrl = () => {
  // Menggunakan IP lokal komputer agar HP fisik (via Wi-Fi) dan emulator bisa terhubung.
  return 'http://192.168.101.10:5001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Checks connectivity and status of the backend server.
 * Hit GET /api/health
 */
export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.warn('API connection failed:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
};

/**
 * Gets the latest sensor reading from the database.
 * Hit GET /api/sensor-data/latest
 */
export const getLatestSensor = async () => {
  try {
    const response = await api.get('/sensor-data/latest');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getLatestSensor failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets the historical sensor logs from the database.
 * Hit GET /api/sensor-data
 */
export const getSensorHistory = async () => {
  try {
    const response = await api.get('/sensor-data');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getSensorHistory failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

export default api;
