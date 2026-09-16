// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { useChartTheme } from '../useChartTheme';

afterEach(() => {
  cleanup();
  document.documentElement.className = '';
  document.body.innerHTML = '';
});

it('refreshes canvas colors when theme classes are committed after render', async () => {
  const shell = document.createElement('div');
  shell.className = 'dashboard-shell';
  shell.style.setProperty('--foreground', '222 38% 8%');
  document.body.appendChild(shell);
  const { result } = renderHook(() => useChartTheme());
  expect(result.current.tooltipBody).toBe('hsl(222 38% 8%)');

  // The provider applies CSS classes after consumers have already rendered.
  shell.style.setProperty('--foreground', '165 22% 96%');
  document.documentElement.classList.add('dark');
  await waitFor(() => expect(result.current.tooltipBody).toBe('hsl(165 22% 96%)'));

  shell.style.setProperty('--primary', '44 100% 64%');
  document.documentElement.classList.add('theme-royal-gold');
  await waitFor(() => expect(result.current.primary).toBe('hsl(44 100% 64%)'));
});
