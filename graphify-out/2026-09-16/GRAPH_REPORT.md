# Graph Report - xaujournal  (2026-08-30)

## Corpus Check
- 420 files · ~546,234 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2969 nodes · 6361 edges · 196 communities (146 shown, 50 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a3f8f850`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- disciplineRules.js
- BrokerSync.jsx
- src/components/ui/button.tsx
- scripts
- toast.tsx
- devDependencies
- PublicSite.jsx
- clone
- _metaapi-broker.js
- cn
- ContactPage.jsx
- Hero.jsx
- AppRoutes.jsx
- HistoryPage.jsx
- compilerOptions
- LandingPage.jsx
- _shared.tsx
- components.json
- FooterNav.jsx
- tradeAnalytics.js
- firebaseTradeRepository.test.js
- DataTable.jsx
- FirebaseBrokerRepository.js
- AnalyticsPage.jsx
- components/index.ts
- sessionEngine.js
- MEDIUM
- src/lib/utils.ts
- BlogsPage.jsx
- firebase.js
- _admin.ts
- MT4/MT5 Broker Login Sync Implementation
- _firebase.js
- compilerOptions
- JournalRepository
- ShowcaseApp.jsx
- class-variance-authority
- compilerOptions
- FloatingDockNavigation.jsx
- 2. Wrappers — `src/components/app/*.jsx`
- client.ts
- SectionCard.jsx
- EmptyState.jsx
- AnalyticsPage.tsx
- check-bundle-budget.mjs
- vite.config.js
- sticky-footer.tsx
- demoData.js
- vercel.json
- firebase.d.ts
- tradeConfig.js
- _entitlementMiddleware.test.js
- .agents/skills/run-xaujournal/smoke.mjs
- .claude/skills/run-xaujournal/smoke.mjs
- dependencies
- firebase
- decoders.ts
- _security.ts
- App.jsx
- Production Operations & Maintenance Guide — xaujournal
- @google-cloud/storage
- SettingsPage.tsx
- UserDetailPage.tsx
- @radix-ui/react-slot
- XAU Journal × MetaApi — Architecture
- UserAccessEditor.tsx
- react-chartjs-2
- react-dom
- react-router-dom
- resend
- dependencies
- tw-animate-css
- @vercel/analytics
- admin-dashboard/components.json
- @vercel/speed-insights
- models/index.ts
- HIGH
- compilerOptions
- migrate-performance-data.mjs
- marketData.test.js
- SECURITY-AUDIT-2026-08.md
- Run xaujournal (dev)
- Run xaujournal (dev)
- 🛡️ Maintenance & Security Post-Deployment Checklist
- 🚀 Project Scope
- XAU Journal Architecture
- _adminAnalytics.ts
- useBrokerAccounts.js
- marketData.js
- DashboardRightSidebar.jsx
- AnalyticsPage.disciplineLock.test.jsx
- rules/graphify.md
- workflows/graphify.md
- C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out
- H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset
- _tradeService.ts
- html2canvas
- H-04 — Unauthenticated `/api/contact` writes to Firestore, sends email, and injects raw HTML into the ops inbox
- metaapi.cloud-sdk
- H-03 — Rate limiting keys on a client-suppliable header
- M-03 — Lemon Squeezy webhook: non-constant-time signature check, no replay protection
- app/AuthenticatedApp.jsx
- @fontsource-variable/newsreader
- admin-dashboard/src/components/ui/dropdown-menu.tsx
- @google-cloud/recaptcha-enterprise
- react
- @fontsource-variable/geist
- _entitlementMiddleware.ts
- react-bootstrap-icons
- AuthenticatedRoutes.jsx
- cn
- LogTradePage.discipline.test.jsx
- Admin Dashboard Adversarial Security Review — 2026-08-29
- ErrorBoundary.jsx
- HistoryPage.setupWiring.test.jsx
- api/index.ts
- DashboardLayout.sidebarWiring.test.js
- IsoDateString
- devDependencies
- eslint-plugin-react-hooks
- admin-dashboard/package.json
- AuthContext.tsx
- AnalyticsTables.tsx
- compilerOptions
- inMemoryRepositories.js
- useAppServices
- BlogArticlePage.jsx
- smoke-local.mjs
- api/[...route].ts
- _middleware.ts
- pages/index.ts
- TradeRepository
- _admin.security.test.js
- build-og.mjs
- dev-admin.mjs
- useTrades.editTrade.test.jsx
- DashboardLayout.profileMenu.test.js
- eslint
- SetupCombobox.jsx
- AnnouncementRepository.ts
- useBrokerAccounts.adopt.test.jsx
- useSetups.js
- PricingPage.jsx
- vitest
- shots/README.md
- EditTradeModal.submit.test.jsx
- BrokerRepository
- InMemoryJournalRepository
- dev-admin-api.mjs
- admin-dashboard/README.md
- FirebaseJournalRepository
- admin-dashboard/vercel.json
- Admin console operations
- deploy-both.mjs
- InMemorySubscriptionRepository
- LiveMarketWidget.jsx
- admin-dashboard/src/lib/utils.ts
- compilerOptions
- firebase-functions
- admin-dashboard/src/components/ui/select.tsx
- @testing-library/user-event
- @types/react-dom
- vite.config.ts
- vercel
- _adminUsers.ts
- couponPatch
- tailwindcss
- admin-dashboard/src/components/ui/sheet.tsx
- LiveMarketWidget.test.jsx
- admin-dashboard/src/components/ui/table.tsx
- _adminErrors.ts
- _admin.test.js
- admin-dashboard/src/components/ui/avatar.tsx
- useAppTheme.js
- slugifySetupName
- ManageSetupsDialog.test.jsx
- chartTheme.js
- admin-dashboard/src/components/ui/tabs.tsx
- AuthenticatedSessionContext.jsx
- @eslint/js
- @firecms/neat
- jsdom
- @tailwindcss/postcss
- @testing-library/jest-dom
- @testing-library/react
- typescript
- typescript-eslint
- vite

## God Nodes (most connected - your core abstractions)
1. `cn()` - 211 edges
2. `cn()` - 106 edges
3. `createAdminApi()` - 41 edges
4. `Button()` - 32 edges
5. `IsoDateString` - 31 edges
6. `cx()` - 29 edges
7. `formatDate()` - 24 edges
8. `useToast()` - 23 edges
9. `AnalyticsPage()` - 23 edges
10. `resolveSessionAt()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `getUserAnalytics()` --indirect_call--> `isTradeAnalyticsEligible()`  [INFERRED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `timeSeries()` --indirect_call--> `isTradeAnalyticsEligible()`  [INFERRED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `persistBrokerTrades()` --calls--> `analyticsUpdate()`  [EXTRACTED]
  api/_brokerTradePersistence.ts → src/lib/tradeAnalytics.js
- `persistBrokerTrades()` --calls--> `sessionAnalyticsUpdate()`  [EXTRACTED]
  api/_brokerTradePersistence.ts → src/lib/tradeAnalytics.js
- `persistBrokerTrades()` --calls--> `subtractSessionAnalytics()`  [EXTRACTED]
  api/_brokerTradePersistence.ts → src/lib/tradeAnalytics.js

## Import Cycles
- None detected.

## Communities (196 total, 50 thin omitted)

### Community 0 - "disciplineRules.js"
Cohesion: 0.08
Nodes (23): sameRules(), useDisciplineSettings(), earliestDayKey(), EMPTY_TRADES, useDisciplineViolations(), clampRuleValue(), dayKeyMidnightMs(), DEFAULT_DISCIPLINE_RULES (+15 more)

### Community 1 - "BrokerSync.jsx"
Cohesion: 0.08
Nodes (29): BrokerLogo(), BrokerSync(), handleConnect(), handleManualSync(), handleRemove(), BrokerWall(), PLATFORMS, BROKER_CHIP_MARKS (+21 more)

### Community 2 - "src/components/ui/button.tsx"
Cohesion: 0.07
Nodes (27): useSessionWallet(), AppDialog(), SIZE_CLASS, VETO_REASONS, toast, WalletTopUpDialog(), DashboardLayout(), BentoCard() (+19 more)

### Community 3 - "scripts"
Cohesion: 0.04
Nodes (46): author, description, name, overrides, axios, braces, cross-spawn, crypto-js (+38 more)

### Community 4 - "toast.tsx"
Cohesion: 0.15
Nodes (7): toast, ToastAction(), ToastClose(), ToastContent(), ToastDescription(), ToastTitle(), ToastViewport()

### Community 5 - "devDependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, eslint-plugin-react-refresh, globals, devDependencies, autoprefixer, eslint-plugin-react-refresh, globals, postcss (+11 more)

### Community 6 - "PublicSite.jsx"
Cohesion: 0.17
Nodes (12): NAV_LINKS, PublicNavbar(), ArrowOut(), CTAButton(), Panel(), Shot(), Wordmark(), SHOT_HEIGHT (+4 more)

### Community 7 - "clone"
Cohesion: 0.10
Nodes (7): byDateDesc(), clone(), docSnapshot(), InMemoryBrokerRepository, InMemorySetupRepository, InMemoryTradeRepository, querySnapshot()

### Community 8 - "_metaapi-broker.js"
Cohesion: 0.17
Nodes (20): combineEntryDeals(), deleteMetaApiAccount(), fetchBrokerTrades(), fetchMetaApiDeals(), finiteNumber(), getApi(), isBuyDeal(), isTradeDeal() (+12 more)

### Community 9 - "cn"
Cohesion: 0.10
Nodes (36): Input(), Separator(), SheetContent(), SheetDescription(), SheetHeader(), SheetTitle(), Sidebar(), SidebarContent() (+28 more)

### Community 10 - "ContactPage.jsx"
Cohesion: 0.09
Nodes (19): BROKER_COUNTS, buildPayload(), COMING_SOON_NAMES, ContactPage(), describedBy(), EMPTY_FORM, FIELD_IDS, FIELD_ORDER (+11 more)

### Community 11 - "Hero.jsx"
Cohesion: 0.09
Nodes (29): Chapters, DESK_NAMES, initialRailId(), RAIL, RAIL_TO_DESK, ReadChapterRail(), SessionFigures(), SessionRail() (+21 more)

### Community 12 - "AppRoutes.jsx"
Cohesion: 0.08
Nodes (23): AppRoutes(), BlogArticlePage, BlogsPage, ContactPage, isShowcaseRequested(), LandingPage, Login, NotFoundPage (+15 more)

### Community 13 - "HistoryPage.jsx"
Cohesion: 0.08
Nodes (36): useSessionBrokerAccounts(), EmptyState(), EMPTY_LIST, EMPTY_MAP, SectionCard(), CurrencyConverter(), ratesCache, ToastContext (+28 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, baseUrl, ignoreDeprecations, jsx, lib, module, moduleDetection (+18 more)

### Community 15 - "LandingPage.jsx"
Cohesion: 0.10
Nodes (33): FAQ(), Proof(), STEPS, PageSEO(), TextLink(), useDeskReveal(), applyArticleSEO(), applyHeadTags() (+25 more)

### Community 16 - "_shared.tsx"
Cohesion: 0.16
Nodes (25): AnnouncementRecord, blankCoupon, CouponRecord, OverviewPage(), PaymentRecord, ReportRecord, typeTabs, AsyncAction (+17 more)

### Community 17 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 18 - "FooterNav.jsx"
Cohesion: 0.10
Nodes (33): listCities(), normalizeSession(), RAIL_FILL, segmentState(), SessionGlyph(), SessionRail(), SATURDAY_1200_UTC, TUESDAY_0800_UTC (+25 more)

### Community 19 - "tradeAnalytics.js"
Cohesion: 0.09
Nodes (41): addSessionDelta(), persistBrokerTrades(), chunkedDbGetAll(), migrateAnalytics(), ANALYTICS_VERSION, analyticsDeltaForTrades(), CLOSE_FIELDS, closeMoment() (+33 more)

### Community 20 - "firebaseTradeRepository.test.js"
Cohesion: 0.18
Nodes (3): fake, logTrade, repository

### Community 21 - "DataTable.jsx"
Cohesion: 0.18
Nodes (14): DataTable(), hideClass(), isEnd(), baseProps, columns, rows, Table(), TableBody() (+6 more)

### Community 22 - "FirebaseBrokerRepository.js"
Cohesion: 0.27
Nodes (6): FirebaseBrokerRepository, adoptBrokerCallable(), callBrokerApi(), connectBrokerCallable(), disconnectBrokerCallable(), syncBrokerTradesCallable()

### Community 23 - "AnalyticsPage.jsx"
Cohesion: 0.10
Nodes (41): DirectionCell(), TradeShareCard, useMonthTrades(), primarySessionForCode(), getTradeOutcome(), getTradeSessionCode(), getTradeSetupKey(), getTradeStrategyTags() (+33 more)

### Community 24 - "components/index.ts"
Cohesion: 0.08
Nodes (48): AdminNavItem, AdminShell(), AdminShellProps, defaultAdminNavigation, routeIsActive(), Button, ButtonProps, ButtonSize (+40 more)

### Community 25 - "sessionEngine.js"
Cohesion: 0.10
Nodes (28): baseTrade, TradeEntity, LogTradeUseCase, CODE_HUBS, EMPTY, HUB_ORDER, HUB_PRIORITY, hubWindowMs() (+20 more)

### Community 26 - "MEDIUM"
Cohesion: 0.12
Nodes (16): Fix, Fix, Fix, Fix, Fix, Fix, Fix, M-01 — CSP permits `'unsafe-inline'` and `'unsafe-eval'` (+8 more)

### Community 27 - "src/lib/utils.ts"
Cohesion: 0.12
Nodes (16): SQUARE_STATE, StatusSquare(), Badge(), badgeVariants, Tabs(), TabsContent(), TabsList(), tabsListVariants (+8 more)

### Community 28 - "BlogsPage.jsx"
Cohesion: 0.11
Nodes (15): Arrow(), articles, articles, studyArticles, studyCategories, articles, COUNTS, FeaturedNote() (+7 more)

### Community 29 - "firebase.js"
Cohesion: 0.12
Nodes (11): ResetTradesUseCase, FirebaseSubscriptionRepository, FirebaseWalletRepository, db, app, auth, facebookProvider, firebaseConfig (+3 more)

### Community 30 - "_admin.ts"
Cohesion: 0.13
Nodes (32): actorFrom(), AdminActor, adminActorRateLimit(), ANNOUNCEMENT_FIELDS, assertIdentifier(), auditData(), auditDataFor(), auditSensitiveRead() (+24 more)

### Community 31 - "MT4/MT5 Broker Login Sync Implementation"
Cohesion: 0.04
Nodes (45): 1. **Broker Service** (`api/_metaapi-broker.js`), 1. **MT5SyncSetup** (`src/components/MT5SyncSetup.jsx`), 2. **API Endpoint** (`api/broker-login-sync.js`), 2. **BrokerLoginSync** (`src/components/BrokerLoginSync.jsx`), 3. **Cron Job** (`api/cron/broker-sync-poller.js`), 3. **useBrokerAccounts Hook** (`src/hooks/useBrokerAccounts.js`), Add Broker Account, API Authentication (+37 more)

### Community 32 - "_firebase.js"
Cohesion: 0.21
Nodes (8): db, isDbReady(), app, mockKvStore, args, identity, list, revoke

### Community 33 - "compilerOptions"
Cohesion: 0.17
Nodes (11): vite.config.js, compilerOptions, allowJs, allowSyntheticDefaultImports, composite, module, moduleResolution, noEmit (+3 more)

### Community 35 - "ShowcaseApp.jsx"
Cohesion: 0.23
Nodes (10): AppServicesContext, AppServicesProvider(), createAppServices(), AuthenticatedRoutes(), PageLoader(), DEMO_DATASET, createShowcaseServices(), NO_ACTIONS (+2 more)

### Community 36 - "class-variance-authority"
Cohesion: 0.67
Nodes (3): class-variance-authority, class-variance-authority, class-variance-authority

### Community 37 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, allowSyntheticDefaultImports, checkJs, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+15 more)

### Community 39 - "2. Wrappers — `src/components/app/*.jsx`"
Cohesion: 0.08
Nodes (24): 0.1 Fix `--win` / `--loss` (still the old, failing values), 0.2 Scope the heading rules, 0.3 Sanctioned primitive edits — the complete list, 0. Prerequisites — land these before the first wrapper, 1.1 Surfaces, 1.2 Type roles, 1.3 Spacing and density, 1.4 State encoding (+16 more)

### Community 40 - "client.ts"
Cohesion: 0.10
Nodes (27): AccessTokenProvider, ADMIN_API_BASE_URL, ADMIN_API_TIMEOUT_MS, AdminApiError, AdminApiErrorCategory, AdminApiErrorOptions, adminRequest(), AdminRequestOptions (+19 more)

### Community 41 - "SectionCard.jsx"
Cohesion: 0.19
Nodes (11): DELTA_CLASS, DELTA_SIGN, StatCard(), TONE_CLASS, Card(), CardAction(), CardContent(), CardDescription() (+3 more)

### Community 42 - "EmptyState.jsx"
Cohesion: 0.33
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 43 - "AnalyticsPage.tsx"
Cohesion: 0.17
Nodes (17): AnalyticsDateRange(), AnalyticsDateRangeProps, AnalyticsDateRangeValue, DateErrors, formatAnalyticsRange(), todayDateInputValue(), validateRange(), validDateInput() (+9 more)

### Community 44 - "check-bundle-budget.mjs"
Cohesion: 0.25
Nodes (8): budgets, directory, eager, eagerKb, files, gzipKb(), html, htmlPath

### Community 45 - "vite.config.js"
Cohesion: 0.28
Nodes (7): CHART_VENDOR, __dirname, EAGER_FORBIDDEN, manualChunks(), normalizeId(), packageOf(), REACT_VENDOR

### Community 46 - "sticky-footer.tsx"
Cohesion: 0.17
Nodes (8): AnimatedContainerProps, FooterLink, FooterLinkGroup, footerLinkGroups, socialLinks, StickyFooter(), StickyFooterProps, mocks

### Community 47 - "demoData.js"
Cohesion: 0.05
Nodes (49): BASE_URL, BROWSERS, captureRoute(), Cdp, debug(), encode(), freePort(), launchBrowser() (+41 more)

### Community 48 - "vercel.json"
Cohesion: 0.40
Nodes (4): crons, headers, redirects, rewrites

### Community 51 - "_entitlementMiddleware.test.js"
Cohesion: 0.13
Nodes (16): ACTIVE_PRO, expire(), FREE, FUTURE, get(), GRACE, incr(), LAPSED_GRACE (+8 more)

### Community 55 - "dependencies"
Cohesion: 0.11
Nodes (19): @base-ui/react, chart.js, dotenv, firebase-admin, framer-motion, @google-cloud/firestore, hono, dependencies (+11 more)

### Community 57 - "decoders.ts"
Cohesion: 0.14
Nodes (51): ANNOUNCEMENT_LEVELS, ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_TARGETS, announcementTarget(), COUPON_TYPES, decodeAdminHealth(), decodeAnalytics(), decodeAnnouncement() (+43 more)

### Community 58 - "_security.ts"
Cohesion: 0.17
Nodes (14): handleRemindExpiry(), assertCron(), assertRequiredConfig(), escapeHtml(), isRecaptchaConfigured(), isValidAccountId(), isValidUid(), RecaptchaResult (+6 more)

### Community 59 - "App.jsx"
Cohesion: 0.11
Nodes (21): App(), AuthSyncFailure(), LinkPeek(), ScrollProgress(), clearUxState(), shouldSkip(), useRouteExperience(), isPublicNavbarPath() (+13 more)

### Community 60 - "Production Operations & Maintenance Guide — xaujournal"
Cohesion: 0.11
Nodes (18): 1. Secrets Management & Rotation Plan, 2. Production Monitoring & Logging Setup, 3. Reliability & Downtime Mitigation, 4. Scaling Optimization, 5. Emergency Manual Deployments, A. Firebase Admin SDK / Service Account Rotation, 🔔 Alerting Thresholds, B. MetaApi Cloud Token Rotation (+10 more)

### Community 62 - "SettingsPage.tsx"
Cohesion: 0.10
Nodes (20): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+12 more)

### Community 63 - "UserDetailPage.tsx"
Cohesion: 0.16
Nodes (22): AnalyticsSeriesTable(), displayValue(), AdminErrorDescription, canonicalUserId(), describeAdminError(), displayUserName(), BreakdownTable(), percent() (+14 more)

### Community 65 - "XAU Journal × MetaApi — Architecture"
Cohesion: 0.17
Nodes (11): Backend (Firebase Cloud Functions), Code map, Deploy checklist, Environment variables, Firestore schema, Overview, Security rule, UI flow (Sync page) (+3 more)

### Community 66 - "UserAccessEditor.tsx"
Cohesion: 0.36
Nodes (7): AccessDraft, AccessField, initialDraft(), toIsoDateTime(), toLocalDateTime(), UserAccessEditor(), UserAccessEditorProps

### Community 71 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, clsx, firebase, lucide-react, next-themes, radix-ui, react, react-dom (+15 more)

### Community 74 - "admin-dashboard/components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 83 - "models/index.ts"
Cohesion: 0.09
Nodes (39): CouponCreate, CouponUpdate, ReportUpdate, SystemSettingsUpdate, UserUpdate, AdminCollectionState, PagingState, useAdminCollection() (+31 more)

### Community 84 - "HIGH"
Cohesion: 0.18
Nodes (11): Attack scenario, Attack scenario, Fix, Fix, Fix, Fix, H-02 — Cloud Functions expose the broker path with no subscription check and no rate limit, H-05 — Unauthenticated reCAPTCHA proxy burns billable assessment quota (+3 more)

### Community 85 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noUnusedLocals (+10 more)

### Community 86 - "migrate-performance-data.mjs"
Cohesion: 0.17
Nodes (17): ACCOUNT_CREDENTIAL_FIELDS, USER_CREDENTIAL_FIELDS, initAdmin(), apply, deletionPatch(), main(), ownsAny(), scrubBrokerAccounts() (+9 more)

### Community 87 - "marketData.test.js"
Cohesion: 0.15
Nodes (13): getMarketDataHealth(), PROXY_DOWN_AFTER_FAILURES, PROXY_SKIP_WINDOW_MS, subscribeMarketDataHealth(), useMarketDataHealth(), driveProxyDown(), httpStatus(), isProxyUrl() (+5 more)

### Community 88 - "SECURITY-AUDIT-2026-08.md"
Cohesion: 0.22
Nodes (8): Appendix — what remediation changed, Controls worth adding beyond individual fixes, Executive summary, LOW / INFORMATIONAL, Production-grade recommendations, Remediation status, What is already done well, xaujournal — Production Security Audit

### Community 89 - "Run xaujournal (dev)"
Cohesion: 0.22
Nodes (8): Auth gate (dashboard access), Gotchas, Prerequisites, Run (agent path), Run (human path), Run xaujournal (dev), Test, Troubleshooting

### Community 90 - "Run xaujournal (dev)"
Cohesion: 0.22
Nodes (8): Auth gate (dashboard access), Gotchas, Prerequisites, Run (agent path), Run (human path), Run xaujournal (dev), Test, Troubleshooting

### Community 91 - "🛡️ Maintenance & Security Post-Deployment Checklist"
Cohesion: 0.22
Nodes (8): 1. 🚨 Usage & Spend Alerts (CRITICAL), 2. 🔑 API Key Rotation Plan, 3. 🧹 Git History Scrubbing, 4. 🧪 Production Monitoring, Firebase Usage Alerts, 🛡️ Maintenance & Security Post-Deployment Checklist, Steps to Rotate:, Vercel Spend Alerts

### Community 92 - "🚀 Project Scope"
Cohesion: 0.22
Nodes (8): 1. Performance Terminal (The Execution Engine), 2. Cognitive Briefs (Journals), 3. Tiered Ecosystem (Subscription Logic), 4. Hardened Security Infrastructure, ⚖️ Compliance, 🚀 Project Scope, 🛠️ Tech Stack, xaujournal — Pro Trade Intelligence Terminal

### Community 93 - "XAU Journal Architecture"
Cohesion: 0.22
Nodes (8): Backend structure, Dependency rule, Extension rules, Frontend structure, Internal admin console, Product map, Safe migration path, XAU Journal Architecture

### Community 94 - "_adminAnalytics.ts"
Cohesion: 0.16
Nodes (28): addBreakdownValue(), AdminDateRange, aggregateSummary(), analyticsTrade(), boundedRangeDocs(), cursorFingerprint(), decodeTradeCursor(), encodeTradeCursor() (+20 more)

### Community 95 - "useBrokerAccounts.js"
Cohesion: 0.32
Nodes (15): dropLocalAccount(), hasServerLogin(), useBrokerAccounts(), addAccount(), hasSessionCredential(), removeAccount(), syncAccount(), accountsKey() (+7 more)

### Community 96 - "marketData.js"
Cohesion: 0.17
Nodes (23): ABORTED, beginShared(), chartQuery(), directJson(), fetchSpotPrice(), fetchYahooChart(), health, inFlight (+15 more)

### Community 97 - "DashboardRightSidebar.jsx"
Cohesion: 0.07
Nodes (35): EditTradeModal(), ImageViewerModal(), CONFIDENCE_SCALE, CONFLUENCE, DashboardRightSidebar(), EMPTY_SETUPS, GRADES, legacySessionPrefill() (+27 more)

### Community 98 - "AnalyticsPage.disciplineLock.test.jsx"
Cohesion: 0.47
Nodes (4): dayKeyAgo(), h, renderPage(), trade()

### Community 101 - "C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out"
Cohesion: 0.50
Nodes (4): Attack scenarios, C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out, CRITICAL, Fix

### Community 102 - "H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset"
Cohesion: 0.67
Nodes (3): Attack scenario, Fix, H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset

### Community 103 - "_tradeService.ts"
Cohesion: 0.14
Nodes (18): now(), handleTradeWebhook(), hashToken(), handleCloseTradeSync(), handleOpenTradeSync(), isoOrNull(), resolveKey(), dateContradicts() (+10 more)

### Community 105 - "H-04 — Unauthenticated `/api/contact` writes to Firestore, sends email, and injects raw HTML into the ops inbox"
Cohesion: 0.67
Nodes (3): Attack scenarios, Fix, H-04 — Unauthenticated `/api/contact` writes to Firestore, sends email, and injects raw HTML into the ops inbox

### Community 107 - "H-03 — Rate limiting keys on a client-suppliable header"
Cohesion: 0.67
Nodes (3): Attack scenario, Fix, H-03 — Rate limiting keys on a client-suppliable header

### Community 108 - "M-03 — Lemon Squeezy webhook: non-constant-time signature check, no replay protection"
Cohesion: 0.67
Nodes (3): Attack scenario, Fix, M-03 — Lemon Squeezy webhook: non-constant-time signature check, no replay protection

### Community 109 - "app/AuthenticatedApp.jsx"
Cohesion: 0.18
Nodes (11): AuthenticatedApp(), AuthenticatedAppContent(), PUBLIC_LEGAL_PATHS, AuthenticatedApp, VerifyEmailBanner(), useOnboarding(), FREE_SUBSCRIPTION, useSubscription() (+3 more)

### Community 111 - "admin-dashboard/src/components/ui/dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 115 - "_entitlementMiddleware.ts"
Cohesion: 0.25
Nodes (12): assertEmailVerified(), getUidFromContext(), isEmailVerificationEnforced(), isSyncAllowed(), verifyIdToken(), assertPro(), ProGateOptions, requireAuth() (+4 more)

### Community 117 - "AuthenticatedRoutes.jsx"
Cohesion: 0.14
Nodes (9): AnalyticsPage, BrokerSync, CalendarPage, CheckoutCancel, CheckoutSuccess, HistoryPage, JournalPage, LogTradePage (+1 more)

### Community 118 - "cn"
Cohesion: 0.04
Nodes (79): Logo(), Alert(), AlertAction(), AlertDescription(), AlertTitle(), alertVariants, Avatar(), AvatarBadge() (+71 more)

### Community 119 - "LogTradePage.discipline.test.jsx"
Cohesion: 0.40
Nodes (3): dayKeyAgo(), h, trade()

### Community 120 - "Admin Dashboard Adversarial Security Review — 2026-08-29"
Cohesion: 0.08
Nodes (24): Admin Dashboard Adversarial Security Review — 2026-08-29, Adversaries and failure modes, Critical, Executive summary, Findings, H-01 — MFA and role separation remain unenforced, H-02 — Remediated: hard user deletion was replaced with a recoverable request, High (+16 more)

### Community 121 - "ErrorBoundary.jsx"
Cohesion: 0.15
Nodes (8): cardStyle, detailStyle, ErrorBoundary, eyebrowStyle, iconStyle, primaryButtonStyle, secondaryButtonStyle, shellStyle

### Community 122 - "HistoryPage.setupWiring.test.jsx"
Cohesion: 0.18
Nodes (5): archiveSetup, createSetup, SETUPS, TRADE, toast

### Community 123 - "api/index.ts"
Cohesion: 0.09
Nodes (21): reasonedBody(), requestData(), requestDataWithMetadata(), AdminHealthRepository, CouponRepository, OverviewRepository, PaymentRepository, reportPatch() (+13 more)

### Community 124 - "DashboardLayout.sidebarWiring.test.js"
Cohesion: 0.83
Nodes (3): declaredProps(), passedProps(), withoutComments()

### Community 125 - "IsoDateString"
Cohesion: 0.05
Nodes (53): UserAnalyticsSectionProps, AnalyticsRepository, SubscriptionRepository, AdminApiAvailability, AdminHealth, AdminHealthCheck, AdminHealthCheckStatus, Analytics (+45 more)

### Community 126 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 128 - "admin-dashboard/package.json"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, preview, smoke:local, typecheck (+2 more)

### Community 129 - "AuthContext.tsx"
Cohesion: 0.12
Nodes (24): ADMIN_EMAIL, ADMIN_UID, AdminAdmissionError, AdminAdmissionFailure, admissionErrorMessage(), verifyAdminAdmission(), AdminLogin(), authErrorMessage() (+16 more)

### Community 130 - "AnalyticsTables.tsx"
Cohesion: 0.19
Nodes (14): AnalyticsSeries, asRecord(), combineOutcomes(), extractAnalyticsSeries(), extractPaymentOutcomes(), finiteNumber(), PAYMENT_STATUS_LABELS, PaymentOutcomeRow (+6 more)

### Community 131 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, checkJs, lib, noEmit, paths, strict, types (+7 more)

### Community 132 - "inMemoryRepositories.js"
Cohesion: 0.13
Nodes (6): SubscriptionRepository, WalletRepository, channel(), createInMemoryRepositories(), createShowcaseStore(), InMemoryWalletRepository

### Community 133 - "useAppServices"
Cohesion: 0.48
Nodes (5): useAppServices(), useJournals(), byDateDesc(), mergeTrades(), useTrades()

### Community 134 - "BlogArticlePage.jsx"
Cohesion: 0.20
Nodes (13): getArticle(), BlogArticlePage(), escapeRegExp(), formatUpdated(), Headline(), NOTES, readRail(), sectionIds() (+5 more)

### Community 135 - "smoke-local.mjs"
Cohesion: 0.30
Nodes (10): checkApi(), checkUi(), fetchChecked(), LOOPBACK_HOSTS, main(), parseApiPath(), parseLocalUiUrl(), pass() (+2 more)

### Community 136 - "api/[...route].ts"
Cohesion: 0.11
Nodes (28): deletionPatch(), resend, AccountLockResult, cachedJson(), inflight, sleep(), withAccountLock(), withRetryBudget() (+20 more)

### Community 137 - "_middleware.ts"
Cohesion: 0.28
Nodes (7): getClientIp(), adminAllowedOrigins, allowedOrigins, DEFAULT_SCOPE, RATE_LIMIT_SCOPES, rateLimitMiddleware(), secureHeadersMiddleware

### Community 138 - "pages/index.ts"
Cohesion: 0.19
Nodes (13): AnalyticsPage, AnnouncementsPage, App(), CouponsPage, OverviewPage, PaymentsPage, ReportsPage, SettingsPage (+5 more)

### Community 140 - "_admin.security.test.js"
Cohesion: 0.21
Nodes (9): AUTH_HEADERS, comparable(), createFirestore(), createHarness(), VALID_CLAIMS, AdminRateLimitResult, LimitWindow, localAdminRateLimitFallbackAllowed() (+1 more)

### Community 141 - "build-og.mjs"
Cohesion: 0.40
Nodes (3): out, root, shot

### Community 142 - "dev-admin.mjs"
Cohesion: 0.25
Nodes (7): adminDirectory, adminViteEntry, apiEntry, missing, requiredFiles, rootDirectory, vercelEntry

### Community 143 - "useTrades.editTrade.test.jsx"
Cohesion: 0.22
Nodes (6): APPLIED_PATCH, harness, LATER_TRADE, OLD_TRADE, RECENT_TRADE, USER

### Community 146 - "SetupCombobox.jsx"
Cohesion: 0.20
Nodes (10): effectiveSlug(), EMPTY_SETUPS, SetupCombobox(), CATALOG, Popover(), PopoverContent(), PopoverDescription(), PopoverHeader() (+2 more)

### Community 147 - "AnnouncementRepository.ts"
Cohesion: 0.19
Nodes (10): AnnouncementRepository, Announcement, AnnouncementCreate, AnnouncementLevel, AnnouncementListParams, AnnouncementStatus, AnnouncementTarget, AnnouncementUpdate (+2 more)

### Community 149 - "useSetups.js"
Cohesion: 0.28
Nodes (12): compareSetups(), effectiveSlug(), findSlugOwner(), firestoreCatalog, lookup(), nextSortOrder(), SEED_DEFINITIONS, seedDefaults() (+4 more)

### Community 150 - "PricingPage.jsx"
Cohesion: 0.07
Nodes (28): AuthenticatedOverlays(), ConsentModal(), PLAN_LINES, PricingBridge(), OnboardingModal(), PricingModal(), FEATURE_COPY, ProFeatureUpsellModal() (+20 more)

### Community 153 - "EditTradeModal.submit.test.jsx"
Cohesion: 0.21
Nodes (10): affectedKeys(), postMerge(), renderModal(), RULES, rulesTradeAllowlist(), SERVER_OWNED, stripComments(), submitEdit() (+2 more)

### Community 156 - "dev-admin-api.mjs"
Cohesion: 0.40
Nodes (3): environmentPath, rootDirectory, vercelEntry

### Community 157 - "admin-dashboard/README.md"
Cohesion: 0.25
Nodes (7): Admin API and CORS, Admission policy, Integration barrels, Local development, Proxy overrides and diagnostics, Repository commands, Vercel project settings

### Community 159 - "admin-dashboard/vercel.json"
Cohesion: 0.29
Nodes (6): cleanUrls, framework, headers, rewrites, $schema, trailingSlash

### Community 160 - "Admin console operations"
Cohesion: 0.29
Nodes (6): Admin console operations, Deployment order, Grant or revoke access, Retiring the old repository, Security invariant, Vercel projects

### Community 161 - "deploy-both.mjs"
Cohesion: 0.29
Nodes (3): adminDir, args, rootDir

### Community 163 - "LiveMarketWidget.jsx"
Cohesion: 0.26
Nodes (12): applyRealPrice(), applyTick(), baselineOf(), LiveMarketWidget(), percentChange(), readYahooQuote(), SPOT_SYMBOLS, tickPollMs() (+4 more)

### Community 164 - "admin-dashboard/src/lib/utils.ts"
Cohesion: 0.20
Nodes (6): Badge(), badgeVariants, Switch(), Tooltip(), TooltipContent(), TooltipTrigger()

### Community 165 - "compilerOptions"
Cohesion: 0.29
Nodes (6): compilerOptions, baseUrl, ignoreDeprecations, paths, files, references

### Community 167 - "admin-dashboard/src/components/ui/select.tsx"
Cohesion: 0.18
Nodes (8): SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger()

### Community 172 - "_adminUsers.ts"
Cohesion: 0.25
Nodes (9): AdminDependencies, AdminHttpError, decodeCursor(), DirectoryCursor, encodeCursor(), listAdminUsers(), matchesFilters(), normalizedText() (+1 more)

### Community 173 - "couponPatch"
Cohesion: 0.42
Nodes (11): announcementPatch(), assertOnlyFields(), booleanValue(), boundedString(), couponPatch(), enumValue(), finiteNumber(), nullableIso() (+3 more)

### Community 174 - "tailwindcss"
Cohesion: 0.67
Nodes (3): tailwindcss, tailwindcss, tailwindcss

### Community 175 - "admin-dashboard/src/components/ui/sheet.tsx"
Cohesion: 0.24
Nodes (5): Button(), buttonVariants, Sheet(), SheetFooter(), SheetOverlay()

### Community 176 - "LiveMarketWidget.test.jsx"
Cohesion: 0.24
Nodes (3): mountWidget(), selectTimeframe(), settle()

### Community 177 - "admin-dashboard/src/components/ui/table.tsx"
Cohesion: 0.22
Nodes (8): Table(), TableBody(), TableCaption(), TableCell(), TableFooter(), TableHead(), TableHeader(), TableRow()

### Community 178 - "_adminErrors.ts"
Cohesion: 0.31
Nodes (7): requireAdmin(), AdminErrorCategory, adminErrorResponse(), categoryForStatus(), ensureRequestId(), requestIdMiddleware(), validRequestId()

### Community 179 - "_admin.test.js"
Cohesion: 0.32
Nodes (6): authHeaders, corsApp(), createHarness(), createStore(), VALID_CLAIMS, corsMiddleware()

### Community 180 - "admin-dashboard/src/components/ui/avatar.tsx"
Cohesion: 0.29
Nodes (6): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage()

### Community 181 - "useAppTheme.js"
Cohesion: 0.38
Nodes (4): AppProviders(), ToastProvider(), ThemeContext, ThemeProvider()

### Community 182 - "slugifySetupName"
Cohesion: 0.48
Nodes (7): effectiveSlug(), findSlugOwner(), legacyTag(), ManageSetupsDialog(), trimmed(), legacySetupName(), slugifySetupName()

### Community 183 - "ManageSetupsDialog.test.jsx"
Cohesion: 0.33
Nodes (5): actionIn(), BY_ID, CATALOG, rowFor(), TRADES

### Community 184 - "chartTheme.js"
Cohesion: 0.43
Nodes (4): readTokens(), resolveChartTheme(), seriesColor(), TOKEN_NAMES

### Community 185 - "admin-dashboard/src/components/ui/tabs.tsx"
Cohesion: 0.40
Nodes (5): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger()

### Community 186 - "AuthenticatedSessionContext.jsx"
Cohesion: 0.47
Nodes (4): AuthenticatedSessionProvider(), BrokerAccountsContext, WalletContext, useWallet()

## Knowledge Gaps
- **835 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+830 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `DashboardRightSidebar.jsx`, `src/components/ui/button.tsx`, `toast.tsx`, `FloatingDockNavigation.jsx`, `PublicSite.jsx`, `SectionCard.jsx`, `EmptyState.jsx`, `HistoryPage.jsx`, `sticky-footer.tsx`, `FooterNav.jsx`, `SetupCombobox.jsx`, `DataTable.jsx`, `AnalyticsPage.jsx`, `src/lib/utils.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `resolveSessionAt()` connect `sessionEngine.js` to `DashboardRightSidebar.jsx`, `_tradeService.ts`, `_metaapi-broker.js`, `demoData.js`, `tradeAnalytics.js`, `AnalyticsPage.jsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `admin-dashboard/src/lib/utils.ts`, `admin-dashboard/src/components/ui/select.tsx`, `admin-dashboard/src/components/ui/dropdown-menu.tsx`, `admin-dashboard/src/components/ui/sheet.tsx`, `admin-dashboard/src/components/ui/table.tsx`, `admin-dashboard/src/components/ui/avatar.tsx`, `admin-dashboard/src/components/ui/tabs.tsx`, `SettingsPage.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createAdminApi()` (e.g. with `publicAuthUser()` and `requestIdMiddleware()`) actually correct?**
  _`createAdminApi()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _835 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `disciplineRules.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08250355618776671 - nodes in this community are weakly interconnected._
- **Should `BrokerSync.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08478513356562137 - nodes in this community are weakly interconnected._