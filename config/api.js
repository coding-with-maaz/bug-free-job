// API Configuration
export const API_CONFIG = {
  // For Android emulator, use 10.0.2.2 instead of localhost
  // For iOS simulator, use localhost
  // For physical device, use your computer's local IP address
  BASE_URL: 'http://10.0.2.2:5000/api', // Android emulator
  // BASE_URL: 'http://localhost:5000/api', // iOS simulator
  // BASE_URL: 'http://192.168.1.xxx:5000/api', // Physical device (replace xxx with your IP)
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// API Endpoints
export const ENDPOINTS = {
  JOBS: {
    ALL: '/jobs',
    FEATURED: '/jobs/featured',
    LATEST: '/jobs/latest',
    TODAY: '/jobs/today',
    SEARCH: '/jobs/search',
    DETAILS: (id) => `/jobs/${id}`,
    BY_SLUG: (slug) => `/jobs/slug/${slug}`,
    SAVE: (id) => `/jobs/${id}/save`,
    SAVED: '/jobs/saved'
  },
  CATEGORIES: {
    ALL: '/categories',
    POPULAR: '/categories/popular',
    DETAILS: (id) => `/categories/${id}`,
    BY_SLUG: (slug) => `/categories/slug/${slug}`,
    JOBS: (id) => `/categories/${id}/jobs`
  }
}; 