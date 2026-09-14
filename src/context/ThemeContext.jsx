import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME } from '../data/defaultTheme.js';
import { mergeTheme, themeToCssVars } from '../utils/theme.js';
import { useQuiz } from './QuizContext.jsx';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'qnahut:session-theme';

function loadSessionTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw ? mergeTheme(JSON.parse(raw)) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }) {
  const { quiz, isRemoteMirror, updateTheme } = useQuiz();
  const [theme, setThemeState] = useState(() => mergeTheme(quiz?.theme || loadSessionTheme()));

  const setTheme = useCallback((nextTheme) => {
    const mergedTheme = mergeTheme(nextTheme);
    setThemeState(mergedTheme);
    if (quiz) updateTheme(mergedTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(mergedTheme));
    } catch {
      // The current tab still uses the theme if storage is unavailable.
    }
  }, [quiz, updateTheme]);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, [setTheme]);

  useEffect(() => {
    if (quiz?.theme) {
      const nextTheme = mergeTheme(quiz.theme);
      if (JSON.stringify(nextTheme) !== JSON.stringify(theme)) {
        setThemeState(nextTheme);
      }
    } else if (quiz && !isRemoteMirror && JSON.stringify(quiz.theme) !== JSON.stringify(theme)) {
      updateTheme(theme);
    }
  }, [isRemoteMirror, quiz, theme, updateTheme]);

  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);

  const value = useMemo(
    () => ({ theme, setTheme, resetTheme, cssVars }),
    [cssVars, resetTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
