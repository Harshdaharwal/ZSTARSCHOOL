import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { AuthContext } from './authContext.js';
import { DEMO_ADMIN, DEMO_TEACHER } from '../config/authCredentials.js';
import { getFirebase, isFirebaseConfigured } from '../services/firebase/client.js';

const STORAGE_KEY = 'school-admin-auth';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000; // 30 seconds

const ROLES = ['admin', 'teacher'];

function readCachedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
      localStorage.removeItem(STORAGE_KEY);
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

function getSeedDirectoryProfile(email, uid = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === String(DEMO_ADMIN.email).trim().toLowerCase()) {
    return {
      email: DEMO_ADMIN.email,
      role: 'admin',
      uid,
      teacherId: '',
      studentIds: [],
    };
  }
  if (normalizedEmail === String(DEMO_TEACHER.email).trim().toLowerCase()) {
    return {
      email: DEMO_TEACHER.email,
      role: 'teacher',
      uid,
      teacherId: DEMO_TEACHER.teacherId,
      studentIds: [],
    };
  }
  return null;
}

async function findFirstByField(db, col, field, value) {
  const snaps = await getDocs(query(collection(db, col), where(field, '==', value), limit(1)));
  if (!snaps.empty) return snaps.docs[0].data();
  return null;
}

async function resolveDirectoryProfileFromFirestore(db, email, uid = '') {
  const emailTrim = String(email || '').trim();
  const emailLc = emailTrim.toLowerCase();

  const seed = getSeedDirectoryProfile(emailTrim, uid);
  if (seed) return seed;

  // Prefer email_lc for case-insensitive match (newer docs)
  let d = emailLc ? await findFirstByField(db, 'users', 'email_lc', emailLc) : null;

  // Backward-compat: older docs may only have email (and may be stored lowercase already)
  if (!d && emailTrim) {
    d = await findFirstByField(db, 'users', 'email', emailTrim);
    if (!d && emailTrim !== emailLc) d = await findFirstByField(db, 'users', 'email', emailLc);
  }
  if (d) return d;

  // Teacher auto-provision: if there is a teacher record with this email, treat it as a valid teacher directory entry.
  let t = emailLc ? await findFirstByField(db, 'teachers', 'Email_LC', emailLc) : null;
  if (!t && emailTrim) {
    t = await findFirstByField(db, 'teachers', 'Email', emailTrim);
    if (!t && emailTrim !== emailLc) t = await findFirstByField(db, 'teachers', 'Email', emailLc);
  }
  if (t) {
    return {
      email: emailTrim,
      role: 'teacher',
      uid,
      teacherId: t.Teacher_ID || '',
      studentIds: [],
    };
  }

  return null;
}

export function AuthProvider({ children }) {
  // Always seed from cache so Firebase users also get instant reload sessions.
  const [user, setUser] = useState(() => readCachedUser());
  // Rate limiting: track failed attempts per email { [email]: { count, until } }
  const attemptsRef = useRef({});

  const persistUser = useCallback((next) => {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
    setUser(next);
  }, []);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return undefined;

    return onAuthStateChanged(fb.auth, async (fu) => {
      if (!fu) {
        persistUser(null);
        return;
      }
      try {
        const snap = await getDoc(doc(fb.db, 'users', fu.uid));
        let d = snap.exists() ? snap.data() : null;
        if (!d) d = await resolveDirectoryProfileFromFirestore(fb.db, fu.email, fu.uid);
        if (!d || !ROLES.includes(d.role)) {
          await signOut(fb.auth);
          persistUser(null);
          return;
        }

        // Ensure canonical profile exists under docId=uid for faster subsequent logins.
        try {
          const emailTrim = String(fu.email || d.email || '').trim();
          await setDoc(
            doc(fb.db, 'users', fu.uid),
            {
              email: emailTrim,
              email_lc: emailTrim.toLowerCase(),
              role: d.role,
              teacherId: d.teacherId || '',
              studentIds: Array.isArray(d.studentIds) ? d.studentIds : [],
              uid: fu.uid,
            },
            { merge: true }
          );
        } catch {
          /* ignore write fail */
        }
        persistUser(mapProfileToFirestoreUser(fu, d));
      } catch {
        const fallback = await resolveDirectoryProfileFromFirestore(fb.db, fu.email, fu.uid);
        if (fallback && ROLES.includes(fallback.role)) {
          persistUser(mapProfileToFirestoreUser(fu, fallback));
          return;
        }
        await signOut(fb.auth);
        persistUser(null);
      }
    });
  }, [persistUser]);

  /** Returns an error message if the email is currently locked out, otherwise null. */
  const checkRateLimit = useCallback((email) => {
    const key = email.toLowerCase();
    const entry = attemptsRef.current[key];
    if (!entry) return null;
    if (entry.until && Date.now() < entry.until) {
      const secs = Math.ceil((entry.until - Date.now()) / 1000);
      return `Too many failed attempts. Try again in ${secs}s.`;
    }
    return null;
  }, []);

  /** Records a failed attempt; sets lockout after MAX_ATTEMPTS. */
  const recordFailure = useCallback((email) => {
    const key = email.toLowerCase();
    const prev = attemptsRef.current[key] || { count: 0, until: 0 };
    const count = prev.count + 1;
    const until = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : prev.until;
    attemptsRef.current[key] = { count, until };
  }, []);

  /** Clears rate-limit counter on success. */
  const clearFailures = useCallback((email) => {
    delete attemptsRef.current[email.toLowerCase()];
  }, []);

  const loginWithFirebase = useCallback(async (email, password) => {
    const fb = getFirebase();
    const lockMsg = checkRateLimit(email);
    if (lockMsg) return { ok: false, msg: lockMsg };

    // Attempt real Firebase Auth sign-in for ALL credentials (including demo ones).
    // This ensures firebase.auth().currentUser is set so Firestore writes work.
    if (fb) {
      try {
        await setPersistence(fb.auth, browserLocalPersistence);
      } catch { /* continue with default */ }

      try {
        const cred = await signInWithEmailAndPassword(fb.auth, email, password);
        const snap = await getDoc(doc(fb.db, 'users', cred.user.uid));
        let d = snap.exists() ? snap.data() : null;

        if (!d) {
          // Legacy behavior: allow demo admin to self-provision on first login.
          if (String(email || '').trim().toLowerCase() === String(DEMO_ADMIN.email).trim().toLowerCase()) {
            d = { email: DEMO_ADMIN.email, role: 'admin', uid: cred.user.uid, teacherId: '', studentIds: [] };
          } else {
            d = await resolveDirectoryProfileFromFirestore(fb.db, cred.user.email, cred.user.uid);
          }
        }

        if (!d || !ROLES.includes(d.role)) {
          await signOut(fb.auth);
          recordFailure(email);
          return { ok: false, msg: 'This account is not registered with the school. Please contact the office.' };
        }

        // Canonicalize and persist under docId=uid for future logins.
        try {
          const emailTrim = String(cred.user.email || d.email || '').trim();
          await setDoc(
            doc(fb.db, 'users', cred.user.uid),
            {
              email: emailTrim,
              email_lc: emailTrim.toLowerCase(),
              role: d.role,
              teacherId: d.teacherId || '',
              studentIds: Array.isArray(d.studentIds) ? d.studentIds : [],
              uid: cred.user.uid,
            },
            { merge: true }
          );
        } catch {
          /* ignore write fail */
        }
        clearFailures(email);
        persistUser(mapProfileToFirestoreUser(cred.user, d));
        return { ok: true };
      } catch (e) {
        if (e?.code === 'permission-denied') {
          return { ok: false, msg: 'Database access denied. Please check your Firestore Security Rules.' };
        }
        if (e?.code === 'auth/invalid-credential' || e?.code === 'auth/user-not-found' || e?.code === 'auth/wrong-password') {
          recordFailure(email);
          return { ok: false, msg: 'Invalid email or password.' };
        }
        console.warn('[Auth] Firebase sign-in failed:', e?.code || e?.message);
      }
    }

    if (!fb) return { ok: false, msg: 'Firebase is not configured.' };
    recordFailure(email);
    return { ok: false, msg: 'Invalid email or password.' };
  }, [checkRateLimit, recordFailure, clearFailures, persistUser]);


  const loginTeacher = useCallback(
    (email, password) => {
      if (isFirebaseConfigured()) return { ok: false, msg: 'Use your school email and password (Firebase).' };
      const lockMsg = checkRateLimit(email);
      if (lockMsg) return { ok: false, msg: lockMsg };
      if (email === DEMO_TEACHER.email && password === DEMO_TEACHER.password) {
        clearFailures(email);
        persistUser({
          email,
          role: 'teacher',
          teacherId: DEMO_TEACHER.teacherId,
          studentIds: [],
          uid: '',
        });
        return { ok: true };
      }
      recordFailure(email);
      return { ok: false, msg: 'Invalid email or password.' };
    },
    [persistUser, checkRateLimit, recordFailure, clearFailures]
  );

  const loginAdmin = useCallback(
    (email, password) => {
      if (isFirebaseConfigured()) return { ok: false, msg: 'Use your school email and password (Firebase).' };
      const lockMsg = checkRateLimit(email);
      if (lockMsg) return { ok: false, msg: lockMsg };
      if (email === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
        clearFailures(email);
        persistUser({ email, role: 'admin', teacherId: '', studentIds: [], uid: '' });
        return { ok: true };
      }
      recordFailure(email);
      return { ok: false, msg: 'Invalid email or password.' };
    },
    [persistUser, checkRateLimit, recordFailure, clearFailures]
  );

  const logout = useCallback(async () => {
    const fb = getFirebase();
    if (fb) {
      await signOut(fb.auth);
      persistUser(null);
    } else {
      persistUser(null);
    }
  }, [persistUser]);

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
