import { createContext, useContext } from 'react';

/**
 * Provides offline/sync state to any component in the tree.
 * Value shape: { isOnline, pendingCount, syncing, flush }
 */
export const OfflineSyncContext = createContext({
  isOnline: true,
  pendingCount: 0,
  syncing: false,
  flush: async () => {},
});

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}
