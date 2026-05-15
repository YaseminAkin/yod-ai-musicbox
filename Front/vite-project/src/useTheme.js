import { useState, useEffect } from 'react';

// Apply theme to <html> immediately (before React mounts) to avoid flash
const stored = localStorage.getItem('mb-theme') || 'dark';
document.documentElement.dataset.theme = stored;

export function useTheme() {
  const [theme, setTheme] = useState(stored);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('mb-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle, isDark: theme === 'dark' };
}
