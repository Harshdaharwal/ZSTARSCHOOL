/**
 * Offline queue — stores pending write operations in IndexedDB.
 * When the device is offline, write API calls are saved here.
 * When connectivity returns, they are flushed in order.
 */

const DB_NAME = 'edumanage_offline_q';
const STORE = 'pending_ops';
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Save a pending write operation to the queue. */
export async function enqueueOp(method, args) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add({ method, args, queuedAt: Date.now() });
    req.onsuccess = () => resolve(req.result); // returns new id
    tx.onerror = (e) => reject(e.target.error);
  });
}

/** Get all pending operations in insertion order. */
export async function getAllOps() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Remove one synced operation by its id. */
export async function removeOp(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

/** Count of pending operations. */
export async function countOps() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
