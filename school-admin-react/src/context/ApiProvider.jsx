import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiContext } from './apiContext.js';
import { OfflineSyncContext } from './offlineSyncContext.js';
import { createGasApiProxy } from './gasApi.js';
import { createMockApi } from '../services/mockBackend.js';
import { enqueueOp, getAllOps, removeOp, countOps } from '../services/offlineQueue.js';
import { useAuth } from '../hooks/useAuth.js';

const FEE_READ_METHODS = new Set(['getAllFees', 'getPendingFees', 'getPaidFees']);

function pickFirst(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

function normalizeFeeRecord(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  return {
    ...f,
    Fee_ID: pickFirst(f, ['Fee_ID', 'FeeId', 'feeId', 'fee_id', 'id', 'ID']),
    Student_ID: pickFirst(f, ['Student_ID', 'StudentId', 'studentId', 'student_id', 'SID']),
    Student_Name: pickFirst(f, ['Student_Name', 'StudentName', 'studentName', 'student_name', 'Name', 'Student']),
    Class: pickFirst(f, ['Class', 'class', 'Cls', 'cls']),
    Fee_Type: pickFirst(f, ['Fee_Type', 'FeeType', 'feeType', 'fee_type', 'Type']),
    Amount: pickFirst(f, ['Amount', 'amount', 'Amt', 'amt']),
    Due_Date: pickFirst(f, ['Due_Date', 'DueDate', 'dueDate', 'due_date', 'Due']),
    Paid_Date: pickFirst(f, ['Paid_Date', 'PaidDate', 'paidDate', 'paid_date', 'Paid']),
    Status: pickFirst(f, ['Status', 'status']),
    Receipt_No: pickFirst(f, ['Receipt_No', 'ReceiptNo', 'receiptNo', 'receipt_no', 'Receipt']),
    Remarks: pickFirst(f, ['Remarks', 'remarks', 'Note', 'note']) ?? '',
  };
}

function unwrapArray(result) {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    const maybe = pickFirst(result, ['data', 'fees', 'rows', 'items', 'result']);
    if (Array.isArray(maybe)) return maybe;
  }
  return null;
}

/**
 * Write methods that should be queued when offline.
 * Read methods (get*, dashboard*) are skipped — they will just fail gracefully.
 */
const WRITE_METHODS = new Set([
  'markStudentAttendance',
  'markTeacherAttendance',
  'addStudent',
  'updateStudent',
  'setStudentStatus',
  'addTeacher',
  'updateTeacher',
  'deleteTeacher',
  'addClass',
  'deleteClass',
  'addSchedule',
  'deleteSchedule',
  'addFeeRecord',
  'deleteFeeRecord',
  'saveClassFeeSetting',
  'addExam',
  'deleteExam',
  'addMarks',
  'deleteMark',
  'addClassAnnouncement',
  'deleteClassAnnouncement',
  'addAnnouncement',
  'deleteAnnouncement',
  'addSalaryRecord',
  'markSalaryPaid',
  'deleteSalaryRecord',
  'addTimetable',
  'deleteTimetable',
  'addHomework',
  'addHoliday',
  'deleteHoliday',
]);

export function ApiProvider({ children }) {
  const { user } = useAuth();

  const [isOnline, setIsOnline]       = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing]         = useState(false);

  // Keep a stable ref to the base API so flush() always uses the latest
  const baseApiRef = useRef(null);

  // Build base API (GAS or mock)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.script?.run) {
      baseApiRef.current = createGasApiProxy();
    } else {
      baseApiRef.current = createMockApi(() =>
        user
          ? { email: user.email, role: user.role, teacherId: user.teacherId ?? '', studentIds: user.studentIds ?? [] }
          : null
      );
    }
  }, [user]);

  // Sync pending count from IndexedDB on mount
  const refreshCount = useCallback(async () => {
    try {
      const n = await countOps();
      setPendingCount(n);
    } catch { /* IndexedDB unavailable */ }
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  // Flush all queued operations to the backend
  const flush = useCallback(async () => {
    if (!navigator.onLine || !baseApiRef.current) return 0;
    const queue = await getAllOps();
    if (!queue.length) return 0;
    setSyncing(true);
    let synced = 0;
    for (const item of queue) {
      try {
        const fn = baseApiRef.current[item.method];
        if (typeof fn === 'function') {
          await fn(...item.args);
          await removeOp(item.id);
          synced++;
        } else {
          // Method no longer exists — drop it
          await removeOp(item.id);
        }
      } catch (err) {
        // Leave in queue — will retry next time online
        console.warn('[OfflineSync] Retry later:', item.method, err);
      }
    }
    await refreshCount();
    setSyncing(false);
    return synced;
  }, [refreshCount]);

  // Listen for online/offline events
  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      const synced = await flush();
      if (synced > 0) {
        // Dispatch a custom event so any open page can refresh its data
        window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: { synced } }));
      }
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flush]);

  // Build the offline-aware API proxy
  // Write methods → queue when offline, pass-through when online
  // Read methods  → always pass-through (show cached/empty if offline)
  const api = new Proxy(
    {},
    {
      get(_, method) {
        return (...args) => {
          const base = baseApiRef.current;
          if (!base) return Promise.resolve({ ok: false, msg: 'API not ready' });

          const fn = base[method];
          if (typeof fn !== 'function') return Promise.resolve(undefined);

          // Online → call directly
          const normalizeResult = (result) => {
            if (!FEE_READ_METHODS.has(method)) return result;
            const arr = unwrapArray(result);
            if (!arr) {
              if (result && typeof result === 'object' && result.ok === false) {
                console.warn(`[API] ${String(method)} failed:`, result);
              } else {
                console.warn(`[API] ${String(method)} unexpected response:`, result);
              }
              return [];
            }
            return arr.map(normalizeFeeRecord);
          };

          if (navigator.onLine) return Promise.resolve(fn(...args)).then(normalizeResult);

          // Offline + write method → queue and return optimistic success
          if (WRITE_METHODS.has(method)) {
            return enqueueOp(method, args).then(async () => {
              await refreshCount();
              return { ok: true, msg: 'Saved offline. Will sync when you reconnect.' };
            });
          }

          // Offline + read method → attempt anyway (may fail or return stale)
          return Promise.resolve(fn(...args))
            .then(normalizeResult)
            .catch(() => {
              return undefined;
            });
        };
      },
    }
  );

  return (
    <OfflineSyncContext.Provider value={{ isOnline, pendingCount, syncing, flush }}>
      <ApiContext.Provider value={api}>
        {children}
      </ApiContext.Provider>
    </OfflineSyncContext.Provider>
  );
}
