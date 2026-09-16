import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';

import { PublicFooter } from '../components/FooterNav';
import { PublicNavbar } from '../components/PublicNavbar';
import { ProTermsModal } from '../components/ProTermsModal';
import { CTAButton, CTALink, SectionHead, Shot, TextLink } from '../components/PublicSite';
import { useDeskReveal } from '../lib/goldSessions';
import { AppServicesProvider } from '../app/di/AppServicesContext';
import { auth } from '../firebaseAuth';
import { useSubscription } from '../hooks/useSubscription';
import { applyPageSEO, buildFAQSchema, injectJsonLd, removeJsonLd } from '../lib/seo';
import { PRO_MONTHLY_DISPLAY, PRO_YEARLY_DISPLAY, PRO_YEARLY_MONTHLY_DISPLAY, PRO_YEARLY_SAVINGS } from '../lib/pricing';
import './PublicSite.css';
import './PricingPage.css';

/* ————————————————————————————————————————————————————————————————
   xaujournal — pricing, the rate card.

   Two plates: Free is the whole manual journal, Pro adds the broker
   connection, the full analytics and the automation. One switch above
   them chooses the billing interval and the Pro price crossfades; the
   interval is carried into checkout after the Pro terms are accepted.

   Every price on this page is a constant from src/lib/pricing.js, and
   every promise about refunds and cancellation is the one the refund
   policy and the terms of service make.
   ———————————————————————————————————————————————————————————————— */

const FEATURES = [
  { label: 'Unlimited manual trade entries', free: true, pro: true },
  { label: 'Calendar, notes and core P&L', free: true, pro: true },
  { label: 'Setup tags and trade notes', free: true, pro: true },
  { label: 'Chart screenshots on every trade', free: false, pro: true },
  { label: 'MT4/MT5 automatic import', free: false, pro: true },
  { label: 'Full session and setup analytics', free: false, pro: true },
  { label: 'Unlimited synced trade history', free: false, pro: true },
  { label: 'TradingView webhooks and API access', free: false, pro: true },
  { label: 'Priority product support', free: false, pro: true },
];

const COMPARISON_ROWS = [
  ['Trade capture', 'Manual entries', 'Manual + MT4/MT5 sync'],
  ['Review depth', 'Notes and setup tags', 'Screenshots, mood, quality and rules'],
  ['Analytics', 'Core P&L and calendar', 'Sessions, setups and performance trends'],
  ['History', 'Manual journal history', 'Unlimited synced history'],
  ['Automation', 'Not included', 'Broker sync, webhooks and API'],
  ['Support', 'Standard', 'Priority'],
];

/* The two captures under "What Pro adds", each with three notes. The sync
   notes carry the old "capture / keep private" jobs; the analytics notes
   carry "read". */
const PRO_ADDS = [
  {
    shot: 'sync',
    title: 'Broker sync — MT5',
    notes: [
      ['Fills', 'Connect a supported MT4 or MT5 account once. Closed trades arrive in the journal with entry, exit, size and time already filled — nothing copied by hand.'],
      ['Session', 'Each fill is stamped with the session it was opened in — Sydney, Tokyo, London or New York — so the split is there before you open the analytics.'],
      ['Scope', 'Your journal stays account-scoped. A broker connection exists only after you authorise it, and you can remove it from Settings at any time.'],
    ],
  },
  {
    shot: 'analytics',
    title: 'Analytics — by session',
    notes: [
      ['Sessions', 'Win rate, expectancy and average R per session, side by side — the London open and the NY continuation on the same footing.'],
      ['Setups', 'Tag each trade with a setup and compare them on expectancy, win rate and net P&L. The record shows which ones earn their place.'],
      ['History', 'Unlimited synced history. The sample keeps growing, and the analytics read all of it.'],
    ],
  },
];

const FAQ = [
  ['What is included in Free?', 'Unlimited manual logging, the P&L calendar, core statistics, setup tags and notes. It is a full journal, not a trial: build the review habit first, pay only for automation and chart screenshots.'],
  ['Does Free include MT4 or MT5 sync?', 'No. Broker sync is a Pro feature. Free traders enter trades by hand; Pro imports closed trades from a connected MT4 or MT5 account automatically.'],
  ['Which brokers work with sync?', 'Any broker that runs MT4 or MT5. Pick a server preset or enter your broker’s server name, then sign in with the account login and its investor or trading password.'],
  ['When should I move to Pro?', 'Move when copying trades is slowing down your review, or when your sample is large enough that session, setup and execution analytics become useful.'],
  ['Monthly or yearly?', `Monthly is ${PRO_MONTHLY_DISPLAY} a month. Yearly is ${PRO_YEARLY_DISPLAY} billed once — ${PRO_YEARLY_MONTHLY_DISPLAY} a month, $${PRO_YEARLY_SAVINGS} less than twelve monthly payments. Prices are in USD and each plan renews automatically through PayPal.`],
  ['Can I renew or cancel at any time?', 'PayPal renews Pro automatically on your monthly or yearly billing date. Cancel the recurring payment before the next billing date to stop the next charge; access continues through the period already paid for.'],
  ['Is there a refund if Pro is not for me?', 'Refund eligibility follows the xaujournal payment policy. Cancelling stops future renewals; it does not automatically reverse a completed PayPal payment.'],
  ['Is my trading data private?', 'Yes. Journals are account-scoped. A broker account is only connected after you explicitly authorise it.'],
  ['How is payment handled?', 'Checkout and recurring billing are handled by PayPal in USD. You approve the subscription on PayPal, then xaujournal verifies it with PayPal before activating Pro.'],
];

const FAQ_SCHEMA = FAQ.map(([q, a]) => ({ q, a }));

function FeatureLedger({ plan }) {
  return (
    <ul className='xj-ledger'>
      {FEATURES.map((feature) => {
        const included = plan === 'pro' ? feature.pro : feature.free;
        return (
          <li className={included ? undefined : 'is-out'} key={feature.label}>
            {included ? <Check aria-hidden='true' /> : <X aria-hidden='true' />}
            <span>{feature.label}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Monthly / yearly, as two native radios dressed as one pill. */
function BillingSwitch({ value, onChange }) {
  return (
    <div className='xpr-billing'>
      <span className='xj-label' id='billing-label'>Billing</span>
      <div className='xpr-seg' role='radiogroup' aria-labelledby='billing-label' data-billing={value}>
        <label className='xpr-seg-opt'>
          <input
            type='radio'
            name='billing'
            value='monthly'
            checked={value === 'monthly'}
            onChange={() => onChange('monthly')}
          />
          <span className='xpr-seg-face'>Monthly</span>
        </label>
        <label className='xpr-seg-opt'>
          <input
            type='radio'
            name='billing'
            value='yearly'
            checked={value === 'yearly'}
            onChange={() => onChange('yearly')}
          />
          <span className='xpr-seg-face'>
            Yearly
            <span className='xpr-seg-save'>Save ${PRO_YEARLY_SAVINGS}</span>
          </span>
        </label>
        <span className='xpr-seg-thumb' aria-hidden='true' />
      </div>
    </div>
  );
}

function PriceLayer({ on, amount, unit, bill, billing }) {
  return (
    <p className={on ? 'xpr-price-layer is-on' : 'xpr-price-layer'} data-billing={billing} aria-hidden={!on}>
      <strong className='xpr-amount'>{amount}</strong>
      <span className='xpr-unit'>{unit}</span>
      <small className='xpr-bill'>{bill}</small>
    </p>
  );
}

function PricingPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTerms, setShowTerms] = useState(false);
  const [billing, setBilling] = useState('monthly');
  const [checkoutStarting, setCheckoutStarting] = useState(false);
  const user = auth.currentUser;
  const { startCheckout, recordProAcceptance } = useSubscription(user);
  useDeskReveal();

  useEffect(() => {
    applyPageSEO(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    injectJsonLd('ld-pricing-faq', buildFAQSchema(FAQ_SCHEMA));
    return () => removeJsonLd('ld-pricing-faq');
  }, []);

  const handleUpgradeClick = () => {
    if (!user) {
      navigate('/login?mode=signin');
      return;
    }
    setShowTerms(true);
  };

  const handleAcceptTerms = async () => {
    if (checkoutStarting) return;
    setCheckoutStarting(true);
    const accepted = await recordProAcceptance();
    if (accepted) {
      const started = await startCheckout(billing === 'yearly' ? 'pro_yearly' : 'pro_monthly');
      if (started) setShowTerms(false);
    }
    setCheckoutStarting(false);
  };

  return (
    <>
      <PublicNavbar />
      <div className='xj' data-ux-skip='true'>
        <main data-ux-skip='true'>
          <section className='xj-cover xpr-cover' aria-labelledby='pricing-heading'>
            <div className='xj-shell xpr-cover-grid'>
              <div className='xj-settle'>
                <p className='xj-eyebrow'>Pricing</p>
                <h1 id='pricing-heading' className='xj-h1'>Pay for the <em>sync</em>, not the journal.</h1>
              </div>
              <div className='xj-settle'>
                <p className='xj-lede'>
                  Free is a full journal: unlimited manual entries, the calendar, notes, setup tags
                  and core P&L. Pro adds MT4/MT5 broker sync, chart screenshots on every trade, the
                  full session and setup analytics, and TradingView webhooks with API access.
                </p>
                <BillingSwitch value={billing} onChange={setBilling} />
              </div>
            </div>
          </section>

          <section className='xj-section xj-section--plain xpr-plates-section' aria-label='Plans'>
            <div className='xj-shell'>
              <div className='xpr-plates'>
                <article className='xpr-plate xpr-plate--free' aria-labelledby='plan-free'>
                  <p className='xpr-plate-bar'><span>Free · manual desk</span></p>
                  <div className='xpr-plate-head'>
                    <h2 id='plan-free'>Free</h2>
                    <div className='xpr-price'>
                      <PriceLayer on amount='$0' unit='/ mo' bill='No subscription. No trial clock.' billing='always' />
                    </div>
                  </div>
                  <p className='xpr-plate-desc'>
                    For traders building the habit: log the trade, add the context, review the week.
                    No subscription, no clock running.
                  </p>
                  <div className='xpr-plate-ledger'><FeatureLedger plan='free' /></div>
                  <div className='xpr-plate-cta'>
                    <CTALink ghost to='/login?mode=signup'>Start free</CTALink>
                  </div>
                  <p className='xpr-plate-foot'>No subscription · Manual entries stay unlimited</p>
                </article>

                <article className='xpr-plate xpr-plate--lead xj-glass' aria-labelledby='plan-pro' data-billing={billing}>
                  <p className='xpr-plate-bar'>
                    <span>Pro · connected desk</span>
                    <span className='xpr-tag'>Broker sync included</span>
                  </p>
                  <div className='xpr-plate-head'>
                    <h2 id='plan-pro'>Pro</h2>
                    <div className='xpr-price'>
                      <PriceLayer
                        on={billing === 'monthly'}
                        amount={PRO_MONTHLY_DISPLAY}
                        unit='/ mo'
                        bill='Billed monthly'
                        billing='monthly'
                      />
                      <PriceLayer
                        on={billing === 'yearly'}
                        amount={PRO_YEARLY_MONTHLY_DISPLAY}
                        unit='/ mo'
                        bill={`Billed ${PRO_YEARLY_DISPLAY} / yr`}
                        billing='yearly'
                      />
                    </div>
                  </div>
                  <p className='xpr-plate-desc'>
                    For traders past the habit: the fills arrive on their own, the record grows every
                    session, and the analytics can read all of it.
                  </p>
                  <div className='xpr-plate-ledger'><FeatureLedger plan='pro' /></div>
                  <div className='xpr-plate-cta'>
                    <CTAButton onClick={handleUpgradeClick}>Continue with PayPal</CTAButton>
                  </div>
                  <p className='xpr-plate-foot'>
                    PayPal only · USD billing · Renews automatically · Cancel anytime
                  </p>
                  <p className='xpr-plate-foot'>
                    Approval happens on PayPal. Pro activates only after server verification.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className='xj-section' aria-labelledby='pro-adds-heading'>
            <div className='xj-shell'>
              <SectionHead
                split
                eyebrow='What Pro adds'
                id='pro-adds-heading'
                title={<>Fills arrive. The <em>pattern</em> shows.</>}
                lede='Pro is for the trader past the habit. The broker does the typing, the record grows every session, and the analytics get enough sample to answer real questions: which session pays, which setup does not, where the R goes.'
              />
              <div className='xpr-adds'>
                {PRO_ADDS.map(({ shot, title, notes }) => (
                  <div className='xpr-add xj-reveal' key={shot}>
                    <Shot name={shot} title={title} />
                    <dl className='xpr-notes'>
                      {notes.map(([label, text]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{text}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className='xj-section' aria-labelledby='compare-heading'>
            <div className='xj-shell'>
              <SectionHead
                split
                eyebrow='Free against Pro'
                id='compare-heading'
                title={<>The difference is admin and <em>depth.</em></>}
                lede='Both desks let you review honestly. Pro removes the repeated data entry and gives a larger sample enough structure to answer better questions.'
              />

              <div className='xpr-compare xj-reveal' role='table' aria-label='Free and Pro, line by line'>
                <div className='xpr-compare-head' role='row'>
                  <span role='columnheader'>Review task</span>
                  <span role='columnheader'>Free</span>
                  <span role='columnheader'>Pro</span>
                </div>
                {COMPARISON_ROWS.map(([task, free, pro]) => (
                  <div className='xpr-compare-row' role='row' key={task}>
                    <strong role='rowheader'>{task}</strong>
                    <span role='cell' data-plan='Free'>
                      <b className='xpr-compare-plan'>Free</b>
                      {free}
                    </span>
                    <span role='cell' data-plan='Pro'>
                      <b className='xpr-compare-plan'>Pro</b>
                      {pro}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className='xj-section' aria-labelledby='pricing-faq-heading'>
            <div className='xj-shell'>
              <div className='xj-faq xj-reveal'>
                <div>
                  <p className='xj-eyebrow'>Before you choose</p>
                  <h2 id='pricing-faq-heading' className='xj-h2'>Straight answers. No plan <em>fog.</em></h2>
                  <p className='xpr-faq-aside'>
                    <TextLink to='/refund-policy'>Read the payment policy</TextLink>
                  </p>
                </div>
                <div className='xj-faq-list'>
                  {FAQ.map(([question, answer]) => (
                    <details key={question}>
                      <summary>{question}<span aria-hidden='true'>+</span></summary>
                      <p>{answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className='xj-section' aria-label='Start free'>
            <div className='xj-shell'>
              <div className='xj-close-row'>
                <h2 className='xj-h2'>Start on the <em>free</em> desk.</h2>
                <div className='xj-actions'>
                  <CTALink to='/login?mode=signup'>Start free</CTALink>
                  <small>Move to Pro when the fills are worth syncing</small>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
      <PublicFooter />

      {showTerms ? (
        <ProTermsModal
          onAccept={handleAcceptTerms}
          onClose={() => {
            if (!checkoutStarting) setShowTerms(false);
          }}
          busy={checkoutStarting}
          renderAcceptAction={(onAccept) => (
            <div className='xj xpr-terms-action'>
              <CTAButton onClick={onAccept} disabled={checkoutStarting} aria-busy={checkoutStarting}>
                {checkoutStarting ? 'Opening PayPal…' : 'Accept and continue to PayPal'}
              </CTAButton>
              <span className='xpr-checkout-status' role='status' aria-live='polite'>
                {checkoutStarting ? 'Preparing your secure PayPal checkout.' : ''}
              </span>
            </div>
          )}
        />
      ) : null}
    </>
  );
}

export function PricingPage() {
  return (
    <AppServicesProvider>
      <PricingPageContent />
    </AppServicesProvider>
  );
}
