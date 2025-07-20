// Configuration for API endpoints
export const config = {
  // API base URL - will be set via environment variable in production
  apiUrl: 'http://localhost:5000', // This will be overridden in production
  
  // Helper function to build API endpoints
  api: (endpoint: string) => `${config.apiUrl}${endpoint}`,
  
  // Common API endpoints
  endpoints: {
    people: '/api/people',
    relationships: '/api/relationships',
    login: '/api/login',
    register: '/api/register',
    users: {
      pending: '/api/users/pending',
      approve: (id: string | number) => `/api/users/${id}/approve`,
      reject: (id: string | number) => `/api/users/${id}/reject`
    }
  }
};

// Function to set the API URL (call this in your app initialization)
export function setApiUrl(url: string) {
  config.apiUrl = url;
} 