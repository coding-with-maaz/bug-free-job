// API Configuration
const API_CONFIG = {
  // Development URL
  DEV_URL: 'http://localhost:3000/api',
  // Production URL - replace with your actual production URL
  PROD_URL: 'https://your-production-domain.com/api',
  // Get the appropriate URL based on environment
  get API_URL() {
    return __DEV__ ? this.DEV_URL : this.PROD_URL;
  },
  // API Timeout in milliseconds
  TIMEOUT: 10000,
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Export the API URL for use in other files
export const API_URL = API_CONFIG.API_URL;

// Export the entire config object if needed
export default API_CONFIG; 