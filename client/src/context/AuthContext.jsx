import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('bugboard_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Restore user session from token in localStorage on app mount.
   * Validates token against GET /api/v1/auth/me.
   */
  const restoreSession = useCallback(async () => {
    const storedToken = localStorage.getItem('bugboard_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setToken(storedToken);
      } else {
        throw new Error('Failed to validate session');
      }
    } catch (err) {
      console.warn('Session restoration failed or token expired:', err.message);
      localStorage.removeItem('bugboard_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /**
   * Login user with credentials, persist JWT to localStorage, and load profile.
   * @param {Object} credentials - { email, password }
   */
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', credentials);
      if (response.success && response.data?.token) {
        const { token: receivedToken, user: receivedUser } = response.data;
        localStorage.setItem('bugboard_token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true, user: receivedUser };
      }
      throw new Error(response.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register a new Developer or Tester account.
   * Per design decision, does NOT auto-login; user is redirected to log in separately.
   * @param {Object} data - { name, email, password, role }
   */
  const register = useCallback(async (data) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register', data);
      return response;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user by clearing token and active user state (stateless client-side logout).
   */
  const logout = useCallback(() => {
    localStorage.removeItem('bugboard_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      register,
      logout,
      restoreSession,
    }),
    [user, token, isLoading, login, register, logout, restoreSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
