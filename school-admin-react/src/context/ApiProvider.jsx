import { useMemo } from 'react';
import { ApiContext } from './apiContext.js';
import { createGasApiProxy } from './gasApi.js';
import { createMockApi } from '../services/mockBackend.js';
import { useAuth } from '../hooks/useAuth.js';

export function ApiProvider({ children }) {
  const { user } = useAuth();

  const api = useMemo(() => {
    if (typeof window !== 'undefined' && window.google?.script?.run) {
      return createGasApiProxy();
    }
    return createMockApi(() =>
      user
        ? {
            email: user.email,
            role: user.role,
            teacherId: user.teacherId ?? '',
            studentIds: user.studentIds ?? [],
          }
        : null
    );
  }, [user]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
