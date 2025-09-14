// client/src/utils/axiosInstance.js
import axios from 'axios';

// Determine the API base URL based on environment
const getApiBaseUrl = () => {
  // First check if environment variable is set
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Auto-detect based on current hostname
  const hostname = window.location.hostname;
  
  if (hostname.includes('devtunnels.ms')) {
    // Running on tunnel - extract tunnel ID and use backend tunnel URL
    const tunnelId = hostname.split('-')[0]; // Gets 'hr1jqkkg' from 'hr1jqkkg-3000.inc1.devtunnels.ms'
    return `https://${tunnelId}-5000.inc1.devtunnels.ms/`;
  }
  
  // Local development fallback
  return 'http://localhost:5000/';
};

const baseURL = getApiBaseUrl();
console.log('🔧 Axios Base URL:', baseURL); // Debug log

const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 🔐 Attach token before every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging for tunnel requests
    if (window.location.hostname.includes('devtunnels.ms')) {
      console.log('🌐 API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ⚠️ Global error handler (e.g., auth failure)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Additional debugging for tunnel requests
    if (window.location.hostname.includes('devtunnels.ms')) {
      console.error('🌐 Tunnel API Error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login'; // Force logout
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;