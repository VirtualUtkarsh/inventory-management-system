import axios from 'axios';

// 🔧 Determine API base URL with bulletproof environment detection
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  console.log('🔧 Environment Detection:', {
    hostname,
    NODE_ENV: process.env.NODE_ENV,
    isDevelopment,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL
  });

  // Priority 1: Explicit environment variable (overrides everything)
  if (process.env.REACT_APP_API_URL) {
    console.log('🔧 Using explicit REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // Priority 2: Local development (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const localURL = 'http://localhost:5000';
    console.log('🔧 Local development detected:', localURL);
    return localURL;
  }

  // Priority 3: Vercel production deployment
  if (hostname.includes('vercel.app')) {
    const productionURL = 'https://inventorymgmtv1.onrender.com';
    console.log('🔧 Vercel production detected, using Render backend:', productionURL);
    return productionURL;
  }

  // Priority 4: DevTunnels
  if (hostname.includes('devtunnels.ms')) {
    const tunnelId = hostname.split('-')[0];
    const tunnelURL = `https://${tunnelId}-5000.inc1.devtunnels.ms`;
    console.log('🔧 DevTunnels detected:', tunnelURL);
    return tunnelURL;
  }

  // Priority 5: Development fallback
  if (isDevelopment) {
    const fallbackURL = 'http://localhost:5000';
    console.log('🔧 Development mode fallback:', fallbackURL);
    return fallbackURL;
  }

  // Priority 6: Production fallback
  const productionFallback = 'https://inventorymgmtv1.onrender.com';
  console.log('🔧 Production fallback:', productionFallback);
  return productionFallback;
};

// const baseURL = getApiBaseUrl();
const baseURL = process.env.NODE_ENV === 'development' ? '' : getApiBaseUrl();
console.log('🔧 Final Axios Base URL:', baseURL);

// ✅ Create axios instance
const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Cross-origin requests (Vercel -> Render)
  timeout: 15000, // 15 second timeout
});

// 🔐 Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log('🌐 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: config.baseURL + config.url,
      hasToken: !!token
    });

    return config;
  },
  (error) => {
    console.error('🌐 Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ⚠️ Response interceptor with enhanced error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    const errorDetails = {
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      isNetworkError: !error.response,
      isCorsError: error.code === 'ERR_NETWORK' && !error.response,
      isTimeout: error.code === 'ECONNABORTED'
    };

    console.error('❌ API Error Details:', errorDetails);

    // Enhanced error messaging
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        console.error('🕐 Request timeout - Backend might be slow or down');
      } else {
        console.error('🚨 Network Error - Check backend availability and CORS configuration');
      }
    }

    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('🔐 Authentication error - redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;