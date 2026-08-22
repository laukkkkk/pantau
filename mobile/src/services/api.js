import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolves backend base URL.
 * Automatically extracts host IP from Expo Metro server when testing via Expo Go / physical device / emulator.
 */
const getBaseUrl = () => {
  // 1. Explicit env variable or app.json extra config (Production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // 2. Extract host IP dynamically from Expo Metro bundler (Development)
  const hostUri = Constants.expoConfig?.hostUri 
    || Constants.manifest?.debuggerHost 
    || Constants.manifest2?.extra?.expoGo?.developer?.tool;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    // Check if hostIp is a valid IPv4 address (excluding localhost/loopback)
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostIp);
    if (isIp && hostIp !== '127.0.0.1' && hostIp !== 'localhost') {
      return `http://${hostIp}:5001/api`;
    }
  }

  // 3. Web platform fallback
  if (Platform.OS === 'web') {
    return 'http://localhost:5001/api';
  }

  // 4. Default IP fallback for physical Android & iOS devices (e.g. Wi-Fi or Hotspot)
  return 'http://192.168.101.10:5001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 3500, // Fast timeout for responsive fallback
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Returns public URL for downloading E-Modul Budidaya Cabai Jawa PDF
 */
export const getModulPdfUrl = () => {
  return getBaseUrl().replace('/api', '/uploads/Buku_Saku_Cabe_Jawa_Gabungan.pdf');
};

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
export const getLatestSensor = async (bedengId) => {
  try {
    const url = bedengId ? `/sensor-data/latest?bedeng_id=${bedengId}` : '/sensor-data/latest';
    const response = await api.get(url);
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
export const getSensorHistory = async (bedengId) => {
  try {
    const url = bedengId ? `/sensor-data?bedeng_id=${bedengId}` : '/sensor-data';
    const response = await api.get(url);
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
 * Gets the list of demplot bedengs and their latest sensor status.
 * Hit GET /api/bedeng
 */
export const getBedengList = async () => {
  try {
    const response = await api.get('/bedeng');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getBedengList failed:', error.message);
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
 * Creates a new planting cycle.
 * Hit POST /api/siklus-tanam
 */
export const createSiklus = async (data) => {
  try {
    const response = await api.post('/siklus-tanam', data);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API createSiklus failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

/**
 * Updates an existing planting cycle (e.g. mark as finished).
 * Hit PUT /api/siklus-tanam/:id
 */
export const updateSiklus = async (id, data) => {
  try {
    const response = await api.put(`/siklus-tanam/${id}`, data);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API updateSiklus failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

/**
 * Deletes a planting cycle and its associated data.
 * Hit DELETE /api/siklus-tanam/:id
 */
export const deleteSiklus = async (id) => {
  try {
    const response = await api.delete(`/siklus-tanam/${id}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.warn('API deleteSiklus failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

/**
 * Gets the connected season chain for a given planting cycle ID.
 * Hit GET /api/siklus-tanam/:id/rantai
 */
export const getSiklusChain = async (id) => {
  try {
    const response = await api.get(`/siklus-tanam/${id}/rantai`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getSiklusChain failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
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
export const calculateLaporan = async (siklusId, hargaJualEstimasi, hasilPanen) => {
  try {
    const payload = {
      harga_jual_estimasi: parseFloat(hargaJualEstimasi)
    };
    if (hasilPanen !== undefined && !isNaN(parseFloat(hasilPanen))) {
      payload.hasil_panen = parseFloat(hasilPanen);
    }
    const response = await api.post(`/laporan-keuangan/${siklusId}/hitung`, payload);
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
 * Gets all fertilizer recommendation history logs.
 * Hit GET /api/rekomendasi-pupuk
 */
export const getRekomendasiPupuk = async () => {
  try {
    const response = await api.get('/rekomendasi-pupuk');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getRekomendasiPupuk failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generates a new fertilizer recommendation log.
 * Hit POST /api/rekomendasi-pupuk
 */
export const createRekomendasiPupuk = async (sensorData = {}) => {
  try {
    const response = await api.post('/rekomendasi-pupuk', sensorData);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API createRekomendasiPupuk failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Updates a fertilizer recommendation status/dosage/comments.
 * Hit PATCH /api/rekomendasi-pupuk/:id
 */
export const updateRekomendasiPupuk = async (id, data) => {
  try {
    const response = await api.patch(`/rekomendasi-pupuk/${id}`, data);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API updateRekomendasiPupuk failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets all activity schedules.
 * Hit GET /api/jadwal-kegiatan
 */
export const getJadwalKegiatan = async (kategori) => {
  try {
    const url = kategori ? `/jadwal-kegiatan?kategori=${kategori}` : '/jadwal-kegiatan';
    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getJadwalKegiatan failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Creates a new schedule task.
 * Hit POST /api/jadwal-kegiatan
 */
export const createJadwalKegiatan = async (data) => {
  try {
    const response = await api.post('/jadwal-kegiatan', data);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API createJadwalKegiatan failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Updates status or other fields of a schedule.
 * Hit PATCH /api/jadwal-kegiatan/:id
 */
export const updateJadwalKegiatan = async (id, data) => {
  try {
    const response = await api.patch(`/jadwal-kegiatan/${id}`, data);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API updateJadwalKegiatan failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Deletes an activity schedule by ID.
 * Hit DELETE /api/jadwal-kegiatan/:id
 */
export const deleteJadwalKegiatan = async (id) => {
  try {
    const response = await api.delete(`/jadwal-kegiatan/${id}`);
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.warn('API deleteJadwalKegiatan failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Deletes a fertilizer recommendation by ID.
 * Hit DELETE /api/rekomendasi-pupuk/:id
 */
export const deleteRekomendasiPupuk = async (id) => {
  try {
    const response = await api.delete(`/rekomendasi-pupuk/${id}`);
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.warn('API deleteRekomendasiPupuk failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets the list of pest detections.
 * Hit GET /api/deteksi-hama
 */
export const getDeteksiHamaList = async () => {
  try {
    const response = await api.get('/deteksi-hama');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getDeteksiHamaList failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Uploads a plant photo for pest classification and saves the log.
 * Hit POST /api/deteksi-hama
 */
export const createDeteksiHama = async (imageUri, latitude, longitude) => {
  try {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('file', blob, 'photo.png');
    } else {
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('file', {
        uri: imageUri,
        name: filename || 'photo.jpg',
        type: type,
      });
    }
    
    if (latitude !== undefined && latitude !== null) {
      formData.append('latitude', latitude.toString());
    }
    if (longitude !== undefined && longitude !== null) {
      formData.append('longitude', longitude.toString());
    }
    
    const response = await api.post('/deteksi-hama', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 45000,
    });
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API createDeteksiHama failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

/**
 * Deletes a pest scan history log by ID.
 * Hit DELETE /api/deteksi-hama/:id
 */
export const deleteDeteksiHama = async (id) => {
  try {
    const response = await api.delete(`/deteksi-hama/${id}`);
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.warn('API deleteDeteksiHama failed:', error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

/**
 * Gets the dashboard summary data.
 * Hit GET /api/dashboard/ringkasan
 */
export const getDashboardRingkasan = async () => {
  try {
    const response = await api.get('/dashboard/ringkasan');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getDashboardRingkasan failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Gets all device assignments from the backend.
 * Hit GET /api/device-assignment
 */
export const getDeviceAssignments = async () => {
  try {
    const response = await api.get('/device-assignment');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn('API getDeviceAssignments failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Updates the bedeng assignment for a device.
 * Hit PUT /api/device-assignment/:deviceId
 */
export const updateDeviceAssignment = async (deviceId, bedengId) => {
  try {
    const response = await api.put(`/device-assignment/${deviceId}`, {
      bedeng_id: bedengId
    });
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.warn(`API updateDeviceAssignment failed for ${deviceId}:`, error.message);
    return {
      success: false,
      error: error.response ? error.response.data.message : error.message
    };
  }
};

export default api;
