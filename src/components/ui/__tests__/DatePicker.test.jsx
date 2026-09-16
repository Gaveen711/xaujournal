// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from '../DatePicker';

afterEach(cleanup);

it('opens from the keyboard, selects a date, and restores focus', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DatePicker value="2026-09-16" onChange={onChange} />);
  const trigger = screen.getByRole('button', { name: 'Choose date, 2026-09-16' });
  await user.tab();
  expect(document.activeElement).toBe(trigger);
  await user.keyboard('{Enter}');
  await user.click(await screen.findByRole('button', { name: '2026-09-17' }));
  expect(onChange).toHaveBeenCalledWith('2026-09-17');
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('dismisses with Escape without changing the date', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DatePicker value="2026-09-16" onChange={onChange} />);
  const trigger = screen.getByRole('button', { name: 'Choose date, 2026-09-16' });
  await user.click(trigger);
  await screen.findByRole('button', { name: 'Next month' });
  await user.keyboard('{Escape}');
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(onChange).not.toHaveBeenCalled();
});
