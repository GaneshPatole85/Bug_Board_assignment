import axios from 'axios';

/**
 * Base API URL derived from environment or defaulted to local backend API v1.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Centralized Axios instance for BugBoard.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Request Interceptor:
 * Prepares request and allows attaching auth tokens (scaffolded for Phase 2).
 */
apiClient.interceptors.request.use(
  (config) => {
    // Phase 2: Attach Authorization header if JWT token is stored
    const token = localStorage.getItem('bugboard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Normalizes all server responses and errors into a predictable JSON structure:
 * { success: boolean, message: string, errors: array, status: number }
 */
apiClient.interceptors.response.use(
  (response) => {
    // Successfully returned data
    return response.data;
  },
  (error) => {
    const normalizedError = {
      success: false,
      message: 'Network or server error',
      errors: [],
      status: 500,
    };

    if (error.response) {
      // Server responded with an error status (4xx, 5xx)
      const data = error.response.data;
      normalizedError.status = error.response.status;
      normalizedError.message = data?.message || `Request failed with status ${error.response.status}`;
      normalizedError.errors = Array.isArray(data?.errors)
        ? data.errors
        : data?.errors
        ? [data.errors]
        : [];
    } else if (error.request) {
      // Request was made but no response received (e.g. server down)
      normalizedError.status = 0;
      normalizedError.message = 'Unable to reach BugBoard server. Please check your backend connection.';
      normalizedError.errors = [{ message: 'Network connectivity issue or server offline' }];
    } else {
      // Something happened while triggering request
      normalizedError.message = error.message;
    }

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
