import React, { createContext, useContext, useState, useCallback } from 'react';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const [notification, setNotification] = useState(null); // { type, message }
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const notify = useCallback((type, message, duration = 3500) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), duration);
  }, []);

  const notifySuccess = useCallback((msg) => notify('success', msg), [notify]);
  const notifyError   = useCallback((msg) => notify('error',   msg), [notify]);
  const notifyInfo    = useCallback((msg) => notify('info',    msg), [notify]);

  return (
    <FarmContext.Provider value={{
      notification, notify, notifySuccess, notifyError, notifyInfo,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </FarmContext.Provider>
  );
}

export const useFarm = () => {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used within FarmProvider');
  return ctx;
};
