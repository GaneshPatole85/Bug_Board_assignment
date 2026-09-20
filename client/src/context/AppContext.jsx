import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const AppContext = createContext(null);

/**
 * Global App Context Provider.
 * Scaffolds loading, global error handling, and notification state for Phase 1.
 */
export const AppProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);

  const setError = useCallback((error) => {
    setGlobalError(typeof error === 'string' ? { message: error } : error);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      setIsLoading,
      globalError,
      setError,
      clearError,
    }),
    [isLoading, globalError, setError, clearError]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Custom hook to consume the AppContext safely.
 */
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
