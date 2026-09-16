import { Link } from 'react-router-dom';
import { GOLD_SESSIONS, formatUtc, isMarketClosed, isSessionOpen, useUtcClock } from '../lib/goldSessions';
import { Wordmark } from './PublicSite';
import { StickyFooter } from './ui/sticky-footer';

const EXPLORE_LINKS = [
  { to: '/', label: 'Product desk' },
  { to: '/blogs', label: 'Field notes' },
  { to: '/pricing', label: 'Plans' },
  { to: '/contact', label: 'Contact' },
];

const ACCOUNT_LINKS = [
  { to: '/login?mode=signin', label: 'Sign in' },
  { to: '/login?mode=signup', label: 'Start free' },
];

const POLICY_LINKS = [
  { to: '/privacy', label: 'Privacy policy' },
  { to: '/terms-and-conditions', label: 'Terms of service' },
  { to: '/refund-policy', label: 'Payment & cancellation' },
];

const SOCIAL_LINKS = [
  { href: 'https://x.com/xau_journal', label: 'Follow xaujournal on X', icon: 'x' },
  { href: 'https://discord.gg/smbNwBZC2', label: 'Join the xaujournal Discord', icon: 'discord' },
  { href: 'mailto:info@xaujournal.com', label: 'Email xaujournal', icon: 'mail' },
];

function SocialIcon({ name }) {
  if (name === 'x') {
    return <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.25-8.29L2.96 2H9.36l4.42 5.84L18.9 2Zm-1.09 17.84h1.73L8.42 4.05H6.57l11.24 15.79Z' /></svg>;
  }
  if (name === 'discord') {
    return <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M19.54 5.34A16.6 16.6 0 0 0 15.44 4c-.2.36-.44.84-.6 1.22a15.4 15.4 0 0 0-4.68 0A12.7 12.7 0 0 0 9.54 4a16.8 16.8 0 0 0-4.1 1.35C2.84 9.2 2.14 12.95 2.5 16.65a16.5 16.5 0 0 0 5.03 2.55c.41-.55.77-1.14 1.08-1.76-.6-.23-1.18-.51-1.73-.84l.43-.33c3.34 1.55 6.97 1.55 10.27 0l.44.33c-.55.33-1.13.61-1.74.84.31.62.67 1.21 1.08 1.76a16.4 16.4 0 0 0 5.03-2.55c.43-4.29-.74-8-2.85-11.31ZM8.84 14.38c-1 0-1.83-.93-1.83-2.07 0-1.15.8-2.08 1.83-2.08 1.02 0 1.85.94 1.83 2.08 0 1.14-.8 2.07-1.83 2.07Zm6.34 0c-1 0-1.83-.93-1.83-2.07 0-1.15.8-2.08 1.83-2.08 1.02 0 1.85.94 1.83 2.08 0 1.14-.8 2.07-1.83 2.07Z' /></svg>;
  }
  return <svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3.75 5.75h16.5v12.5H3.75V5.75Zm.8 1.1L12 12.37l7.45-5.52M4.7 17.1l5.27-5m9.33 5-5.27-5' /></svg>;
}

// Built once per desk. Constructing Intl.DateTimeFormat is expensive and a fresh
// options object defeats V8's constructor cache, so doing it inline meant four
// new formatters on every tick.
const CITY_FORMATTERS = new Map(
  GOLD_SESSIONS.map((session) => [
    session.tz,
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: session.tz }),
  ]),
);

function cityTime(now, timeZone) {
  return CITY_FORMATTERS.get(timeZone).format(now);
}

/** The footer's one live instrument: four desks and the UTC reference. */
function SessionClocks() {
  // Minute resolution — these read HH:MM, so a 1s tick re-rendered 60× per
  // visible change.
  const now = useUtcClock(30000);
  const closed = isMarketClosed(now);

  return (
    <div className='xj-footer-clocks' role='group' aria-label='Session clocks'>
      {GOLD_SESSIONS.map((session) => (
        <div key={session.id} className={isSessionOpen(session, now) ? 'xj-footer-clock is-open' : 'xj-footer-clock'}>
          <small>{session.city}</small>
          <strong>{cityTime(now, session.tz)}</strong>
        </div>
      ))}
      <div className='xj-footer-clock'>
        <small>{closed ? 'At rest' : 'Reference'}</small>
        <strong>{formatUtc(now, false)} UTC</strong>
      </div>
    </div>
  );
}

export function LegacyPublicFooter({ className = '', style }) {
  return (
    <footer className={`xj xj-footer ${className}`.trim()} style={style} data-ux-skip='true'>
      <div className='xj-shell'>
        <div className='xj-footer-window xj-panel'>
          <div className='xj-panel-bar'>
            <strong>Desk directory</strong>
            <span>XA / 24</span>
          </div>

          <div className='xj-footer-grid'>
            <div className='xj-footer-brand'>
              <Wordmark />
              <p>
                A trade journal built for one instrument. Every fill recorded, every
                reason kept, every session measured.
              </p>
              <nav className='xj-footer-socials' aria-label='Social links'>
                {SOCIAL_LINKS.map(({ href, label, icon }) => (
                  <a
                    key={href}
                    href={href}
                    aria-label={label}
                    title={label}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <SocialIcon name={icon} />
                  </a>
                ))}
              </nav>
            </div>

            <div className='xj-footer-col'>
              <p className='xj-label'>Explore</p>
              <ul>
                {EXPLORE_LINKS.map(({ to, label }) => (
                  <li key={to}><Link to={to}><span>{label}</span><b aria-hidden='true'>↗</b></Link></li>
                ))}
              </ul>
            </div>

            <div className='xj-footer-col'>
              <p className='xj-label'>Account</p>
              <ul>
                {ACCOUNT_LINKS.map(({ to, label }) => (
                  <li key={to}><Link to={to}><span>{label}</span><b aria-hidden='true'>↗</b></Link></li>
                ))}
              </ul>
            </div>

            <div className='xj-footer-col'>
              <p className='xj-label'>Policies</p>
              <ul>
                {POLICY_LINKS.map(({ to, label }) => (
                  <li key={to}><Link to={to}><span>{label}</span><b aria-hidden='true'>↗</b></Link></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <SessionClocks />

        <div className='xj-footer-legal'>
          <p>
            Trading gold and other leveraged products carries substantial risk of loss and is not
            suitable for every investor. xaujournal is a record-keeping and analytics tool — it does
            not execute trades, hold funds, or provide investment advice. Results recorded in a
            journal are not a guarantee of future performance.
          </p>
          <div className='xj-footer-meta'>
            <span>© {new Date().getFullYear()} xaujournal</span>
            <span>XAU/USD spot · session times UTC</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicFooter({ className = '', style }) {
  return <StickyFooter className={className} style={style} />;
}
