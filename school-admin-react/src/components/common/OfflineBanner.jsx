import { useEffect, useState } from 'react';
import { useOfflineSync } from '../../context/offlineSyncContext.js';
import { IconClock, IconCheck, IconRefresh } from './Icons.jsx';

/**
 * Sticky banner that appears when the device goes offline or when
 * there are pending operations waiting to sync.
 */
export function OfflineBanner() {
  const { isOnline, pendingCount, syncing, flush } = useOfflineSync();
  const [justSynced, setJustSynced] = useState(false);

  // Show "All synced!" briefly after sync completes
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.synced > 0) {
        setJustSynced(true);
        const t = setTimeout(() => setJustSynced(false), 3000);
        return () => clearTimeout(t);
      }
    };
    window.addEventListener('offline-sync-complete', handler);
    return () => window.removeEventListener('offline-sync-complete', handler);
  }, []);

  // Nothing to show when online and nothing pending
  if (isOnline && pendingCount === 0 && !justSynced) return null;

  if (justSynced) {
    return (
      <div className="offline-banner offline-banner--synced" role="status">
        <IconCheck size={15} strokeWidth={2.5} />
        <span>All data synced successfully!</span>
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="offline-banner offline-banner--syncing" role="status">
        <span className="offline-spinner" />
        <span>Syncing {pendingCount} saved record{pendingCount !== 1 ? 's' : ''}…</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="offline-banner offline-banner--offline" role="alert">
        <IconClock size={15} strokeWidth={2} />
        <span>
          You are offline.
          {pendingCount > 0
            ? ` ${pendingCount} record${pendingCount !== 1 ? 's' : ''} saved — will sync when reconnected.`
            : ' New data will be saved and synced when you reconnect.'}
        </span>
      </div>
    );
  }

  // Online but still has pending (edge case — manual flush button)
  if (pendingCount > 0) {
    return (
      <div className="offline-banner offline-banner--pending" role="status">
        <IconClock size={15} strokeWidth={2} />
        <span>{pendingCount} record{pendingCount !== 1 ? 's' : ''} pending sync.</span>
        <button className="offline-sync-btn" onClick={flush} disabled={syncing}>
          <IconRefresh size={13} strokeWidth={2} />
          Sync now
        </button>
      </div>
    );
  }

  return null;
}
