// @vitest-environment jsdom
//
// The public rate card: the billing switch has to work by mouse and by
// keyboard, every price on the page has to come from src/lib/pricing.js,
// and the interval the trader picked has to reach checkout — after the Pro
// terms, and only when signed in.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import {
  PRO_MONTHLY_DISPLAY,
  PRO_YEARLY_DISPLAY,
  PRO_YEARLY_MONTHLY_DISPLAY,
  PRO_YEARLY_SAVINGS,
} from '../../lib/pricing';

const navigate = vi.fn();
const startCheckout = vi.fn();
const recordProAcceptance = vi.fn().mockResolvedValue(true);
const authState = { currentUser: null };

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

vi.mock('../../firebaseAuth', () => ({ auth: authState }));

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ startCheckout, recordProAcceptance }),
}));

vi.mock('../../app/di/AppServicesContext', () => ({
  AppServicesProvider: ({ children }) => children,
}));

vi.mock('../../components/PublicNavbar', () => ({ PublicNavbar: () => null }));
vi.mock('../../components/FooterNav', () => ({ PublicFooter: () => null }));

vi.mock('../../components/ProTermsModal', () => ({
  ProTermsModal: ({ onAccept }) => (
    <button type='button' onClick={onAccept}>accept pro terms</button>
  ),
}));

// Touches document.head / IntersectionObserver / matchMedia — none of it is
// under test here.
vi.mock('../../lib/seo', () => ({
  applyPageSEO: vi.fn(),
  buildFAQSchema: vi.fn(() => ({})),
  injectJsonLd: vi.fn(),
  removeJsonLd: vi.fn(),
}));
vi.mock('../../lib/goldSessions', () => ({ useDeskReveal: () => {} }));

const { PricingPage } = await import('../PricingPage');

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pricing']}>
      <PricingPage />
    </MemoryRouter>,
  );
}

/** The Pro price layer currently shown (the other one is aria-hidden). */
function liveProPrice() {
  const plate = screen.getByRole('article', { name: 'Pro' });
  const layers = plate.querySelectorAll('.xpr-price-layer');
  const live = [...layers].filter((layer) => layer.classList.contains('is-on'));
  expect(live).toHaveLength(1);
  return live[0];
}

async function moveToPro(user) {
  await user.click(screen.getByRole('button', { name: /paypal/i }));
}

beforeEach(() => {
  navigate.mockClear();
  startCheckout.mockClear();
  recordProAcceptance.mockClear();
  authState.currentUser = null;
});

describe('PricingPage — billing switch', () => {
  it('starts on monthly, with the monthly price from pricing.js', () => {
    renderPage();
    const group = screen.getByRole('radiogroup', { name: /billing/i });
    expect(within(group).getByRole('radio', { name: /monthly/i })).toBeChecked();
    expect(within(group).getByRole('radio', { name: /yearly/i })).not.toBeChecked();

    const live = liveProPrice();
    expect(live).toHaveTextContent(PRO_MONTHLY_DISPLAY);
    expect(live).toHaveTextContent(/billed monthly/i);
    expect(live).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the yearly saving next to the yearly option, from pricing.js', () => {
    renderPage();
    const yearly = screen.getByRole('radio', { name: /yearly/i });
    expect(yearly).toHaveAccessibleName(new RegExp(`save \\$${PRO_YEARLY_SAVINGS}`, 'i'));
  });

  it('click on Yearly crossfades to the yearly price and the yearly bill line', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('radio', { name: /yearly/i }));

    expect(screen.getByRole('radio', { name: /yearly/i })).toBeChecked();
    const live = liveProPrice();
    expect(live).toHaveTextContent(PRO_YEARLY_MONTHLY_DISPLAY);
    expect(live).toHaveTextContent(`Billed ${PRO_YEARLY_DISPLAY} / yr`);
    expect(live).toHaveAttribute('data-billing', 'yearly');

    const hidden = screen
      .getByRole('article', { name: 'Pro' })
      .querySelector('.xpr-price-layer[data-billing="monthly"]');
    expect(hidden).toHaveAttribute('aria-hidden', 'true');
  });

  it('is keyboard operable: arrow keys move between the two radios', async () => {
    const user = userEvent.setup();
    renderPage();
    const monthly = screen.getByRole('radio', { name: /monthly/i });
    const yearly = screen.getByRole('radio', { name: /yearly/i });

    monthly.focus();
    await user.keyboard('{ArrowRight}');
    expect(yearly).toBeChecked();
    expect(yearly).toHaveFocus();
    expect(liveProPrice()).toHaveTextContent(PRO_YEARLY_MONTHLY_DISPLAY);

    await user.keyboard('{ArrowLeft}');
    expect(monthly).toBeChecked();
    expect(liveProPrice()).toHaveTextContent(PRO_MONTHLY_DISPLAY);
  });

  it('never hard-codes a price: the yearly FAQ answer is built from pricing.js', () => {
    renderPage();
    const faq = screen.getByText('Monthly or yearly?').closest('details');
    expect(faq).toHaveTextContent(PRO_MONTHLY_DISPLAY);
    expect(faq).toHaveTextContent(PRO_YEARLY_DISPLAY);
    expect(faq).toHaveTextContent(PRO_YEARLY_MONTHLY_DISPLAY);
    expect(faq).toHaveTextContent(`$${PRO_YEARLY_SAVINGS}`);
  });
});

describe('PricingPage — moving to Pro', () => {
  it('sends a signed-out trader to sign in instead of opening the terms', async () => {
    const user = userEvent.setup();
    renderPage();
    await moveToPro(user);

    expect(navigate).toHaveBeenCalledWith('/login?mode=signin');
    expect(screen.queryByRole('button', { name: /accept pro terms/i })).not.toBeInTheDocument();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('signed in, monthly: terms first, then monthly checkout', async () => {
    authState.currentUser = { uid: 'u1', email: 'trader@example.com' };
    const user = userEvent.setup();
    renderPage();
    await moveToPro(user);

    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /accept pro terms/i }));

    expect(recordProAcceptance).toHaveBeenCalledTimes(1);
    expect(startCheckout).toHaveBeenCalledWith('pro_monthly');
  });

  it('signed in, yearly: the selected interval reaches checkout', async () => {
    authState.currentUser = { uid: 'u1', email: 'trader@example.com' };
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('radio', { name: /yearly/i }));
    await moveToPro(user);
    await user.click(screen.getByRole('button', { name: /accept pro terms/i }));

    expect(startCheckout).toHaveBeenCalledWith('pro_yearly');
  });

  it('does not start checkout when the acceptance could not be recorded', async () => {
    authState.currentUser = { uid: 'u1', email: 'trader@example.com' };
    recordProAcceptance.mockResolvedValueOnce(false);
    const user = userEvent.setup();
    renderPage();
    await moveToPro(user);
    await user.click(screen.getByRole('button', { name: /accept pro terms/i }));

    expect(startCheckout).not.toHaveBeenCalled();
    // The modal stays up so the trader can try again.
    expect(screen.getByRole('button', { name: /accept pro terms/i })).toBeInTheDocument();
  });
});

describe('PricingPage — page shape', () => {
  it('presents PayPal auto-renewal without legacy crypto checkout language', () => {
    renderPage();

    expect(screen.getAllByText(/paypal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/auto-renew|renews automatically/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/cryptomus|usdt|tron\/trc20/i)).not.toBeInTheDocument();
  });

  it('has exactly one h1 and both plates named', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Free' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Pro' })).toBeInTheDocument();
  });
});
