import { useEffect, useState } from 'react';
import { resolveChartTheme } from '../lib/chartTheme.js';

/** Read after the theme provider commits its classes, not during render. */
export function useChartTheme() {
  const [colors, setColors] = useState(resolveChartTheme);

  useEffect(() => {
    const refresh = () => {
      const next = resolveChartTheme();
      setColors(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    refresh();
    return () => observer.disconnect();
  }, []);

  return colors;
}
