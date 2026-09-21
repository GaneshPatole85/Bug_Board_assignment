import axios from 'axios';

/**
 * Base API URL derived from environment or defaulted to local backend API v1.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Session-expiry notification utility.
 * Fires a visible error toast before redirecting to /login.
 * Uses a custom event so ToastProvider (which may not be accessible directly here) can react.
 */
const dispatchSessionExpiredToast = () => {
  window.dispatchEvent(
    new CustomEvent('bugboard:session-expired', {
      detail: { message: 'Your session has expired — please sign in again.' },
    })
  );
};

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
 * Attaches JWT Authorization header from localStorage if token is present.
 */
apiClient.interceptors.request.use(
  (config) => {
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
 * { success: boolean, message: string, errors: array, fieldErrors: object, status: number }
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
      fieldErrors: {}, // Map of { fieldName: errorMessage } for inline form display
      status: 500,
    };

    if (error.response) {
      const { status, data } = error.response;
      normalizedError.status = status;

      // Automatic session cleanup on 401 Unauthorized
      if (status === 401) {
        localStorage.removeItem('bugboard_token');
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register'
        ) {
          // Notify the user with a toast before redirecting
          dispatchSessionExpiredToast();
          // Small delay to let the toast render before navigation
          setTimeout(() => {
            window.location.href = '/login';
          }, 400);
        }
      }

      // Build errors array from the backend { success, message, errors } envelope
      const rawErrors = Array.isArray(data?.errors)
        ? data.errors
        : data?.errors
        ? [data.errors]
        : [];
      normalizedError.errors = rawErrors;

      if (rawErrors.length > 0) {
        // Build { field: message } map for inline form display
        const fieldMap = {};
        rawErrors.forEach((e) => {
          if (e.field && !fieldMap[e.field]) {
            fieldMap[e.field] = e.message;
          }
        });
        normalizedError.fieldErrors = fieldMap;

        // Build a human-readable joined message from all error entries
        normalizedError.message = rawErrors.map((e) => e.message).join(' · ');
      } else {
        normalizedError.message = data?.message || `Request failed with status ${status}`;
      }
    } else if (error.request) {
      // Request was made but no response received (server offline, timeout, CORS)
      normalizedError.status = 0;
      normalizedError.message =
        "Couldn't reach the BugBoard server. Check your connection and try again.";
      normalizedError.errors = [{ message: 'Network connectivity issue or server offline' }];
    } else {
      // Error occurred while setting up the request
      normalizedError.message = error.message || 'An unexpected error occurred.';
    }

    return Promise.reject(normalizedError);
  }
);

export default apiClient;
