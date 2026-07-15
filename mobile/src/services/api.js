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

/**
 * Gets the list of planting cycles.
 * Hit GET /api/siklus-tanam
 */
export const getSiklusList = async () => {
  try {
    const response = await api.get('/siklus-tanam');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getSiklusList failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets the list of production costs.
 * Hit GET /api/biaya-produksi
 */
export const getBiayaList = async (siklusId) => {
  try {
    const url = siklusId ? `/biaya-produksi?siklus_id=${siklusId}` : '/biaya-produksi';
    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getBiayaList failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Creates a new production cost.
 * Hit POST /api/biaya-produksi
 */
export const createBiaya = async (data) => {
  try {
    const response = await api.post('/biaya-produksi', data);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API createBiaya failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

/**
 * Updates an existing production cost.
 * Hit PUT /api/biaya-produksi/:id
 */
export const updateBiaya = async (id, data) => {
  try {
    const response = await api.put(`/biaya-produksi/${id}`, data);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API updateBiaya failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

/**
 * Deletes a production cost.
 * Hit DELETE /api/biaya-produksi/:id
 */
export const deleteBiaya = async (id) => {
  try {
    const response = await api.delete(`/biaya-produksi/${id}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.warn('API deleteBiaya failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets the financial report for a cycle.
 * Hit GET /api/laporan-keuangan/:siklus_id
 */
export const getLaporan = async (siklusId) => {
  try {
    const response = await api.get(`/laporan-keuangan/${siklusId}`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getLaporan failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Calculates the HPP and profit projection for a cycle.
 * Hit POST /api/laporan-keuangan/:siklus_id/hitung
 */
export const calculateLaporan = async (siklusId, hargaJualEstimasi) => {
  try {
    const response = await api.post(`/laporan-keuangan/${siklusId}/hitung`, {
      harga_jual_estimasi: parseFloat(hargaJualEstimasi)
    });
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API calculateLaporan failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

// Expose the raw API base URL for PDF linking
export const getPdfExportUrl = (siklusId) => {
  return `${getBaseUrl()}/laporan-keuangan/${siklusId}/export-pdf`;
};

/**
 * Gets the land profile.
 * Hit GET /api/lahan
 */
export const getLahanProfile = async () => {
  try {
    const response = await api.get('/lahan');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getLahanProfile failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets the latest sensor reading.
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

export default api;
