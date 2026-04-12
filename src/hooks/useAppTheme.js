import { useState, useEffect } from 'react';

export function useAppTheme() {
  const [isLightMode, setIsLightMode] = useState(() => {
    const saved = localStorage.getItem('xau-theme');
    // Default to dark mode (isLightMode = false) if nothing saved
    return saved === 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isLightMode) {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    localStorage.setItem('xau-theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  const toggleTheme = () => {
    setIsLightMode(prev => !prev);
  };

  return { isLightMode, toggleTheme };
}
