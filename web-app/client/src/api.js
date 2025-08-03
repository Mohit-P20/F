import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the same origin with HTTPS
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  // Development fallback
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add retry configuration
  retry: 3,
  retryDelay: 1000
});

// Request retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Retry on network errors or 5xx errors
    if (
      config &&
      !config.__isRetryRequest &&
      (error.code === 'NETWORK_ERROR' || 
       error.code === 'ECONNABORTED' ||
       (error.response && error.response.status >= 500))
    ) {
      config.__isRetryRequest = true;
      config.__retryCount = config.__retryCount || 0;
      
      if (config.__retryCount < (config.retry || 3)) {
        config.__retryCount++;
        
        // Exponential backoff
        const delay = (config.retryDelay || 1000) * Math.pow(2, config.__retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return api(config);
      }
    }
    
    return Promise.reject(error);
  }
);
// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = Math.random().toString(36).substring(7);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    if (status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.reload();
    } else if (status === 403) {
      // Permission denied - show user-friendly message
      console.warn('Permission denied:', error.response.data.error);
    } else if (status === 429) {
      // Rate limited
      console.warn('Rate limited. Please slow down your requests.');
    } else if (status >= 500) {
      // Server error
      console.error('Server error:', error.response?.data?.error || error.message);
    }
    
    return Promise.reject(error);
  }
);

// API health check function
export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
export default api;
