import { useCallback, useMemo, useState } from 'react';
import { ToastContext } from './toastContext.js';

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const value = useMemo(() => ({ showToast, toast }), [showToast, toast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
