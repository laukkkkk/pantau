import axios from 'axios';
import { Platform } from 'react-native';

// Android Emulator connects to localhost via 10.0.2.2
// iOS Simulator and Web connect directly to localhost (or custom IP)
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
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

export default api;
