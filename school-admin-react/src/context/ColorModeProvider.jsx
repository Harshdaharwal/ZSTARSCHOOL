import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'school-admin-color-mode';
const DARK = 'dark';
const LIGHT = 'light';

function detectInitialMode() {
  if (typeof window === 'undefined') return LIGHT;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === DARK || stored === LIGHT) return stored;
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? DARK : LIGHT;
}

export const ColorModeContext = createContext({
  mode: LIGHT,
  isDark: false,
  toggleMode: () => {},
  setMode: () => {},
});

export function ColorModeProvider({ children }) {
  const [mode, setModeState] = useState(detectInitialMode);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(next === DARK ? DARK : LIGHT);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === DARK ? LIGHT : DARK));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === DARK,
      toggleMode,
      setMode,
    }),
    [mode, toggleMode, setMode]
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}
