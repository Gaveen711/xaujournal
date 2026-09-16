import { PRO_MONTHLY_PRICE, PRO_MONTHLY_DISPLAY, PRO_YEARLY_PRICE } from './pricing';

// Must match the host in public/sitemap.xml, public/robots.txt and index.html.
// This module is the single source of truth for canonical URLs; when it said
// non-www while every other source said www, each page was claimed under two
// hosts at once.
export const SITE_URL = 'https://www.xaujournal.com';
export const SITE_NAME = 'xaujournal';

// Mirrors index.html. Re-applied on every route because a page that wrote a
// plainer value used to leave it downgraded for the rest of the SPA session.
export const DEFAULT_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const SITE_TAGLINE = 'Xaujournal — Gold (XAUUSD) Trading Journal';

export const DEFAULT_TITLE =
  'Xaujournal | Best Gold Trading Journal for XAUUSD — MT4/MT5 Broker Sync';

export const DEFAULT_DESCRIPTION =
  'xaujournal is the XAU journal built for gold traders. Auto-sync MT4/MT5 trades, track XAUUSD P&L, session analytics, trade calendar and journaling free to start.';

export const DEFAULT_KEYWORDS =
  'xau journal, XAU journal, gold trading journal, XAUUSD trading journal, XAU USD journal, MT5 trading journal, MT4 trading journal, gold trader journal, XAUUSD analytics, MT4/MT5 broker sync, forex gold journal';

/**
 * Routes that render another route's content. Without an entry here they
 * self-canonicalize and Google sees an exact duplicate with no preferred
 * version — '/home' renders the same LandingPage as '/'.
 */
export const CANONICAL_ALIASES = {
  '/home': '/',
};

/** Per-route titles & descriptions (public marketing pages) */
export const ROUTE_SEO = {
  '/': {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/pricing': {
    title: `Pricing — ${SITE_NAME} XAU Gold Trading Journal`,
    description:
      `Compare Free and Pro plans for the best XAUUSD trading journal. MT4/MT5 sync, analytics, and session intelligence from ${PRO_MONTHLY_DISPLAY}/month.`,
  },
  '/login': {
    title: `Sign In — ${SITE_NAME} XAU Trading Journal`,
    description:
      'Log in to your xaujournal account. Access your gold (XAUUSD) trade history, analytics, and MT4/MT5-synced journal.',
  },
  '/contact': {
    title: `Contact — ${SITE_NAME} Support`,
    description:
      'Contact the xaujournal team for help with your XAU gold trading journal, MT4/MT5 broker sync, or billing.',
  },
  '/privacy': {
    title: `Privacy Policy — ${SITE_NAME}`,
    description: 'How xaujournal collects, stores, and protects your XAUUSD trading journal data.',
  },
  '/terms-and-conditions': {
    title: `Terms of Service — ${SITE_NAME}`,
    description: 'Terms of use for the xaujournal XAU gold trading journal platform.',
  },
  '/refund-policy': {
    title: `Payment & Cancellation Policy — ${SITE_NAME}`,
    description: 'PayPal subscription billing, automatic renewal, cancellation, and refund policy for xaujournal Pro.',
  },
  '/blogs': {
    title: `Trading Study Materials & Blog — ${SITE_NAME}`,
    description:
      'Free study materials for beginner gold traders — spot XAUUSD basics, lots and pips, sessions, candlestick charts, risk management and trading psychology.',
  },
};

function setMeta(attr, key, value, isProperty = false) {
  const selector = isProperty ? `meta[property="${key}"]` : `meta[${attr}="${key}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    if (isProperty) el.setAttribute('property', key);
    else el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Full head treatment shared by the route-table path and the article path. */
function applyHeadTags({ title, description, url, ogType = 'website' }) {
  const ogImage = `${SITE_URL}/og.png`;

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'keywords', DEFAULT_KEYWORDS);
  setMeta('name', 'robots', DEFAULT_ROBOTS);

  // Open Graph
  setMeta('property', 'og:type', ogType, true);
  setMeta('property', 'og:title', title, true);
  setMeta('property', 'og:description', description, true);
  setMeta('property', 'og:url', url, true);
  setMeta('property', 'og:image', ogImage, true);
  setMeta('property', 'og:site_name', SITE_NAME, true);

  // Twitter
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', ogImage);

  setCanonical(url);
}

/** Update document head for the current public route */
export function applyPageSEO(pathname) {
  // Strip the query and any trailing slash so '/pricing/' and '/pricing' resolve
  // to one canonical instead of self-canonicalizing as two distinct pages.
  const base = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  const config = ROUTE_SEO[base] || ROUTE_SEO['/'];
  // Routes that duplicate another page point at the original.
  const canonicalPath = CANONICAL_ALIASES[base] ?? base;
  const url = `${SITE_URL}${canonicalPath === '/' ? '' : canonicalPath}`;

  applyHeadTags({ title: config.title, description: config.description, url });
}

/** Article JSON-LD for one study article at its canonical URL. */
export function buildArticleSchema(article) {
  const url = `${SITE_URL}/blogs/${article.slug}`;
  const organization = { '@type': 'Organization', name: SITE_NAME, url: SITE_URL };
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    dateModified: article.updated,
    author: organization,
    publisher: {
      ...organization,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` },
    },
    mainEntityOfPage: url,
  };
}

/**
 * Head treatment for one study article: title/description from the article
 * itself, canonical at /blogs/<slug>, and Article JSON-LD. The caller owns
 * cleanup — removeJsonLd('article-schema') on unmount — so the schema never
 * leaks onto the next route.
 */
export function applyArticleSEO(article) {
  applyHeadTags({
    title: `${article.title} — ${SITE_NAME} study`,
    description: article.summary,
    url: `${SITE_URL}/blogs/${article.slug}`,
    ogType: 'article',
  });
  injectJsonLd('article-schema', buildArticleSchema(article));
}

/** FAQ targets “xau journal” / gold journal search queries */
export const LANDING_FAQ = [
  {
    q: 'What is an XAU trading journal?',
    a: 'An XAU trading journal records every gold (XAUUSD) trade entry, exit, lot size, P&L, session, and notes so you can review performance and improve discipline. xaujournal is built only for gold traders, not generic forex pairs.',
  },
  {
    q: 'Is xaujournal the best gold trading journal for MT4/MT5?',
    a: 'xaujournal auto-syncs closed trades from MetaTrader 4 and MetaTrader 5 via our secure broker connection, so you never re-type executions. You get XAUUSD-specific analytics, a P&L calendar, session breakdowns, and manual logging on the free plan.',
  },
  {
    q: 'How is xaujournal different from a Notion XAU journal template?',
    a: 'Notion templates are static. xaujournal is a live app with real-time MT4/MT5 sync, structured analytics, and secure cloud storage designed for active XAUUSD traders.',
  },
  {
    q: 'Do I need Pro to start journaling gold trades?',
    a: 'No. The free plan includes unlimited manual trade logging, calendar, and core P&L tracking. Pro adds MT4/MT5 broker sync, full analytics, TradingView webhooks, and API access.',
  },
  {
    q: 'Does the journal work only for XAUUSD (gold)?',
    a: 'Yes. xaujournal is exclusively for gold spot (XAU/USD). P&L, pips, and analytics are calibrated for XAUUSD contract sizing.',
  },
];

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['XAU Journal', 'XAU journal', 'xau journal'],
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildSoftwareSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    alternateName: 'XAU Journal',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description:
      'Gold (XAUUSD) trading journal with automated MT4/MT5 broker sync, trade calendar, session analytics, and trade notes.',
    url: SITE_URL,
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
      {
        '@type': 'Offer',
        price: String(PRO_MONTHLY_PRICE),
        priceCurrency: 'USD',
        name: 'Pro Monthly',
      },
      {
        '@type': 'Offer',
        price: String(PRO_YEARLY_PRICE),
        priceCurrency: 'USD',
        name: 'Pro Yearly',
      },
    ],
    featureList: [
      'MT4/MT5 broker auto-sync',
      'XAUUSD P&L and pip tracking',
      'Trade calendar heatmap',
      'Session analytics (London, New York, Tokyo)',
      'Trade journal notes',
    ],
  };
}

export function buildFAQSchema(faqItems) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** Inject or replace JSON-LD script tags by id */
export function injectJsonLd(id, data) {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function removeJsonLd(id) {
  document.getElementById(id)?.remove();
}
