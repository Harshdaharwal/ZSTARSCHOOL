import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { AuthContext } from './authContext.js';
import { DEMO_ADMIN, DEMO_TEACHER } from '../config/authCredentials.js';
import { getFirebase, isFirebaseConfigured } from '../services/firebase/client.js';

const STORAGE_KEY = 'school-admin-auth';

const ROLES = ['admin', 'teacher'];

function readMockUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email && ROLES.includes(parsed.role)) {
      return {
        email: parsed.email,
        role: parsed.role,
        teacherId: parsed.teacherId || '',
        studentIds: [],
        uid: parsed.uid || '',
      };
    }
    if (parsed?.email) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function mapProfileToFirestoreUser(fu, d) {
  return {
    email: fu.email || '',
    role: d.role,
    uid: fu.uid,
    teacherId: d.teacherId || '',
    studentIds: Array.isArray(d.studentIds) ? d.studentIds : [],
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (isFirebaseConfigured() ? null : readMockUser()));

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return undefined;

    return onAuthStateChanged(fb.auth, async (fu) => {
      if (!fu) {
        setUser(null);
        return;
      }
      try {
        const snap = await get(ref(fb.rtdb, `users/${fu.uid}`));
        if (!snap.exists()) {
          await signOut(fb.auth);
          setUser(null);
          return;
        }
        const d = snap.val();
        if (!ROLES.includes(d.role)) {
          await signOut(fb.auth);
          setUser(null);
          return;
        }
        setUser(mapProfileToFirestoreUser(fu, d));
      } catch {
        await signOut(fb.auth);
        setUser(null);
      }
    });
  }, []);

  const persistMock = useCallback((next) => {
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
    setUser(next);
  }, []);

  const loginWithFirebase = useCallback(async (email, password) => {
    const fb = getFirebase();
    if (!fb) return { ok: false, msg: 'Firebase is not configured.' };
    try {
      const cred = await signInWithEmailAndPassword(fb.auth, email, password);
      const snap = await get(ref(fb.rtdb, `users/${cred.user.uid}`));
      let d = snap.val();
      if (!snap.exists()) {
        if (email === 'admin@school.com') {
          d = { email, role: 'admin', uid: cred.user.uid, teacherId: '', studentIds: [] };
          await set(ref(fb.rtdb, `users/${cred.user.uid}`), d);
        } else {
          await signOut(fb.auth);
          return { ok: false, msg: 'This account is not registered with the school. Please contact the office.' };
        }
      }
      if (!ROLES.includes(d.role)) {
        await signOut(fb.auth);
        return { ok: false, msg: 'Invalid role for this portal.' };
      }
      setUser(mapProfileToFirestoreUser(cred.user, d));
      return { ok: true };
    } catch (e) {
      const msg = e?.code === 'auth/invalid-credential' ? 'Invalid email or password.' : e?.message || 'Sign-in failed.';
      return { ok: false, msg };
    }
  }, []);

  const loginTeacher = useCallback(
    (email, password) => {
      if (isFirebaseConfigured()) return { ok: false, msg: 'Use your school email and password (Firebase).' };
      if (email === DEMO_TEACHER.email && password === DEMO_TEACHER.password) {
        persistMock({
          email,
          role: 'teacher',
          teacherId: DEMO_TEACHER.teacherId,
          studentIds: [],
          uid: '',
        });
        return { ok: true };
      }
      return { ok: false, msg: 'Invalid email or password.' };
    },
    [persistMock]
  );

  const loginAdmin = useCallback(
    (email, password) => {
      if (isFirebaseConfigured()) return { ok: false, msg: 'Use your school email and password (Firebase).' };
      if (email === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
        persistMock({ email, role: 'admin', teacherId: '', studentIds: [], uid: '' });
        return { ok: true };
      }
      return { ok: false, msg: 'Invalid email or password.' };
    },
    [persistMock]
  );

  const logout = useCallback(async () => {
    const fb = getFirebase();
    if (fb) {
      await signOut(fb.auth);
      setUser(null);
    } else {
      persistMock(null);
    }
  }, [persistMock]);

  const value = useMemo(
    () => ({
      user,
      loginTeacher,
      loginAdmin,
      loginWithFirebase,
      logout,
      isFirebase: isFirebaseConfigured(),
    }),
    [user, loginTeacher, loginAdmin, loginWithFirebase, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
