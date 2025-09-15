// client/src/utils/axiosInstance.js
import axios from 'axios';

// 🔧 Determine API base URL
const getApiBaseUrl = () => {
  // Priority 1: Environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Priority 2: DevTunnels (when running frontend on tunnel)
  const hostname = window.location.hostname;
  if (hostname.includes('devtunnels.ms')) {
    const tunnelId = hostname.split('-')[0]; 
    return `https://${tunnelId}-5000.inc1.devtunnels.ms/`;
  }

  // Priority 3: Local development fallback
  return 'http://localhost:5000';
};

const baseURL = getApiBaseUrl();
console.log('🔧 Axios Base URL:', baseURL);

// ✅ Create axios instance
const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // include cookies if needed
});

// 🔐 Attach token before every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug log for tunnels
    if (window.location.hostname.includes('devtunnels.ms')) {
      console.log(
        '🌐 API Request:',
        config.method?.toUpperCase(),
        config.baseURL + config.url
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ⚠️ Global error handler
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);

    // Extra tunnel debugging
    if (window.location.hostname.includes('devtunnels.ms')) {
      console.error('🌐 Tunnel API Error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }

    // Handle expired/invalid token
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
