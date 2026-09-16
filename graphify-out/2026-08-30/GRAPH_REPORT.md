# Graph Report - xaujournal  (2026-08-29)

## Corpus Check
- 398 files · ~540,018 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2787 nodes · 6049 edges · 175 communities (119 shown, 56 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `716c8bbc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- disciplineRules.js
- BrokerSync.jsx
- button.tsx
- scripts
- cn
- devDependencies
- PublicSite.jsx
- clone
- _metaapi-broker.js
- overrides
- ContactPage.jsx
- Hero.jsx
- AppRoutes.jsx
- HistoryPage.jsx
- compilerOptions
- PricingPage.jsx
- _shared.tsx
- components.json
- FooterNav.jsx
- tradeAnalytics.js
- goldContract.js
- DataTable.jsx
- FirebaseBrokerRepository.js
- AnalyticsPage.jsx
- components/index.ts
- sessionEngine.js
- MEDIUM
- lib/utils.ts
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
- DashboardLayout.jsx
- 2. Wrappers — `src/components/app/*.jsx`
- firebase-admin
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
- hono
- lucide-react
- @radix-ui/react-slot
- XAU Journal × MetaApi — Architecture
- useUsers.ts
- react-chartjs-2
- react-dom
- react-router-dom
- resend
- tailwind-merge
- tw-animate-css
- @vercel/analytics
- @vercel/kv
- @vercel/speed-insights
- hooks/index.ts
- HIGH
- compilerOptions
- migrate-broker-credential-privacy.mjs
- DashboardRightSidebar.jsx
- SECURITY-AUDIT-2026-08.md
- Run xaujournal (dev)
- Run xaujournal (dev)
- 🛡️ Maintenance & Security Post-Deployment Checklist
- 🚀 Project Scope
- XAU Journal Architecture
- _adminAnalytics.ts
- useBrokerAccounts.js
- marketData.js
- EditTradeModal.jsx
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
- @google-cloud/firestore
- @google-cloud/recaptcha-enterprise
- react
- @fontsource-variable/geist
- framer-motion
- react-bootstrap-icons
- package.json
- sidebar.tsx
- LogTradePage.discipline.test.jsx
- Admin Dashboard Adversarial Security Review — 2026-08-29
- ErrorBoundary.jsx
- HistoryPage.setupWiring.test.jsx
- useMutationConfirmation.ts
- DashboardLayout.sidebarWiring.test.js
- models/index.ts
- clsx
- eslint-plugin-react-hooks
- admin-dashboard/package.json
- AuthContext.tsx
- capture-shots.mjs
- compilerOptions
- inMemoryRepositories.js
- useAppServices
- BlogArticlePage.jsx
- smoke-local.mjs
- api/[...route].ts
- _middleware.ts
- pages/index.ts
- TradeRepository
- build-og.mjs
- dev-admin.mjs
- useTrades.editTrade.test.jsx
- DashboardLayout.profileMenu.test.js
- eslint
- SetupCombobox.jsx
- useAnnouncements.ts
- useBrokerAccounts.adopt.test.jsx
- useSetups.js
- PricingPage.test.jsx
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
- postcss
- terser
- admin-dashboard/tsconfig.json
- firebase-functions
- @types/node
- @testing-library/user-event
- @types/react-dom
- vite.config.ts
- vercel
- SettingsPage.resetTerminal.test.jsx
- @vitejs/plugin-react
- tailwindcss

## God Nodes (most connected - your core abstractions)
1. `cn()` - 211 edges
2. `createAdminApi()` - 41 edges
3. `Button()` - 32 edges
4. `IsoDateString` - 31 edges
5. `cx()` - 29 edges
6. `formatDate()` - 24 edges
7. `useToast()` - 23 edges
8. `AnalyticsPage()` - 23 edges
9. `record()` - 22 edges
10. `scripts` - 22 edges

## Surprising Connections (you probably didn't know these)
- `timeSeries()` --indirect_call--> `isTradeAnalyticsEligible()`  [INFERRED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `getUserAnalytics()` --indirect_call--> `isTradeAnalyticsEligible()`  [INFERRED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `publicRecentTrade()` --calls--> `getTradeSessionCode()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `aggregateSummary()` --calls--> `analyticsDeltaForTrades()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `getUserAnalytics()` --calls--> `deriveSessionStats()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js

## Import Cycles
- None detected.

## Communities (175 total, 56 thin omitted)

### Community 0 - "disciplineRules.js"
Cohesion: 0.09
Nodes (22): sameRules(), useDisciplineSettings(), clampRuleValue(), dayKeyMidnightMs(), DEFAULT_DISCIPLINE_RULES, DISCIPLINE_RULES_VERSION, normalizeDisciplineRules(), ORDINAL_SUFFIXES (+14 more)

### Community 1 - "BrokerSync.jsx"
Cohesion: 0.08
Nodes (29): BrokerLogo(), BrokerSync(), handleConnect(), handleManualSync(), handleRemove(), BrokerWall(), PLATFORMS, BROKER_CHIP_MARKS (+21 more)

### Community 2 - "button.tsx"
Cohesion: 0.08
Nodes (27): AuthenticatedOverlays(), AppDialog(), SIZE_CLASS, VETO_REASONS, toast, ConsentModal(), OnboardingModal(), PricingModal() (+19 more)

### Community 3 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, admin:build, admin:dev, admin:grant, admin:list, build, build:budget, deploy (+14 more)

### Community 4 - "cn"
Cohesion: 0.06
Nodes (44): Alert(), AlertAction(), AlertDescription(), AlertTitle(), alertVariants, AlertDialogMedia(), AlertDialogOverlay(), Avatar() (+36 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (27): autoprefixer, @eslint/js, eslint-plugin-react-refresh, globals, jsdom, devDependencies, autoprefixer, @eslint/js (+19 more)

### Community 6 - "PublicSite.jsx"
Cohesion: 0.17
Nodes (12): NAV_LINKS, PublicNavbar(), ArrowOut(), CTAButton(), Panel(), Shot(), Wordmark(), SHOT_HEIGHT (+4 more)

### Community 7 - "clone"
Cohesion: 0.10
Nodes (7): byDateDesc(), clone(), docSnapshot(), InMemoryBrokerRepository, InMemorySetupRepository, InMemoryTradeRepository, querySnapshot()

### Community 8 - "_metaapi-broker.js"
Cohesion: 0.26
Nodes (14): combineEntryDeals(), deleteMetaApiAccount(), fetchBrokerTrades(), fetchMetaApiDeals(), finiteNumber(), getApi(), isBuyDeal(), isTradeDeal() (+6 more)

### Community 9 - "overrides"
Cohesion: 0.11
Nodes (18): overrides, axios, braces, cross-spawn, crypto-js, elliptic, esbuild, fast-xml-parser (+10 more)

### Community 10 - "ContactPage.jsx"
Cohesion: 0.14
Nodes (19): BROKER_COUNTS, buildPayload(), COMING_SOON_NAMES, ContactPage(), describedBy(), EMPTY_FORM, FIELD_IDS, FIELD_ORDER (+11 more)

### Community 11 - "Hero.jsx"
Cohesion: 0.09
Nodes (29): Chapters, DESK_NAMES, initialRailId(), RAIL, RAIL_TO_DESK, ReadChapterRail(), SessionFigures(), SessionRail() (+21 more)

### Community 12 - "AppRoutes.jsx"
Cohesion: 0.08
Nodes (23): AppRoutes(), BlogArticlePage, BlogsPage, ContactPage, isShowcaseRequested(), LandingPage, Login, NotFoundPage (+15 more)

### Community 13 - "HistoryPage.jsx"
Cohesion: 0.08
Nodes (41): AnalyticsPage, BrokerSync, CalendarPage, CheckoutCancel, CheckoutSuccess, HistoryPage, JournalPage, LogTradePage (+33 more)

### Community 14 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleDetection, moduleResolution, noEmit (+15 more)

### Community 15 - "PricingPage.jsx"
Cohesion: 0.06
Nodes (46): FAQ(), PLAN_LINES, PricingBridge(), Proof(), STEPS, PageSEO(), CTALink(), TextLink() (+38 more)

### Community 16 - "_shared.tsx"
Cohesion: 0.09
Nodes (52): AdminErrorDescription, canonicalUserId(), describeAdminError(), displayUserName(), BreakdownTable(), percent(), pointWinRate(), UserAnalyticsSection() (+44 more)

### Community 17 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 18 - "FooterNav.jsx"
Cohesion: 0.11
Nodes (31): listCities(), normalizeSession(), RAIL_FILL, segmentState(), SessionGlyph(), SessionRail(), SATURDAY_1200_UTC, TUESDAY_0800_UTC (+23 more)

### Community 19 - "tradeAnalytics.js"
Cohesion: 0.09
Nodes (39): apply, args, main(), maxUsers, migrateAnalytics(), migrateBrokerJobs(), mode, startAfterBrokerPath (+31 more)

### Community 20 - "goldContract.js"
Cohesion: 0.10
Nodes (10): TradeEntity, LogTradeUseCase, computePips(), isGoldSymbol(), OUTCOME_EPSILON, XAUUSD_OZ_PER_LOT, XAUUSD_PIP_SIZE, fake (+2 more)

### Community 21 - "DataTable.jsx"
Cohesion: 0.18
Nodes (14): DataTable(), hideClass(), isEnd(), baseProps, columns, rows, Table(), TableBody() (+6 more)

### Community 22 - "FirebaseBrokerRepository.js"
Cohesion: 0.27
Nodes (6): FirebaseBrokerRepository, adoptBrokerCallable(), callBrokerApi(), connectBrokerCallable(), disconnectBrokerCallable(), syncBrokerTradesCallable()

### Community 23 - "AnalyticsPage.jsx"
Cohesion: 0.08
Nodes (43): DirectionCell(), StatCard(), TradeShareCard, useMonthTrades(), readTokens(), resolveChartTheme(), seriesColor(), TOKEN_NAMES (+35 more)

### Community 24 - "components/index.ts"
Cohesion: 0.08
Nodes (48): AdminNavItem, AdminShell(), AdminShellProps, defaultAdminNavigation, routeIsActive(), Button, ButtonProps, ButtonSize (+40 more)

### Community 25 - "sessionEngine.js"
Cohesion: 0.11
Nodes (27): baseTrade, pad(), sessionHours(), CODE_HUBS, EMPTY, HUB_ORDER, HUB_PRIORITY, hubWindowMs() (+19 more)

### Community 26 - "MEDIUM"
Cohesion: 0.12
Nodes (16): Fix, Fix, Fix, Fix, Fix, Fix, Fix, M-01 — CSP permits `'unsafe-inline'` and `'unsafe-eval'` (+8 more)

### Community 27 - "lib/utils.ts"
Cohesion: 0.15
Nodes (13): SQUARE_STATE, StatusSquare(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ToggleGroup() (+5 more)

### Community 28 - "BlogsPage.jsx"
Cohesion: 0.11
Nodes (15): Arrow(), articles, articles, studyArticles, studyCategories, articles, COUNTS, FeaturedNote() (+7 more)

### Community 29 - "firebase.js"
Cohesion: 0.12
Nodes (11): ResetTradesUseCase, FirebaseSubscriptionRepository, FirebaseWalletRepository, db, app, auth, facebookProvider, firebaseConfig (+3 more)

### Community 30 - "_admin.ts"
Cohesion: 0.05
Nodes (74): actorFrom(), AdminActor, adminActorRateLimit(), AdminDependencies, ANNOUNCEMENT_FIELDS, announcementPatch(), assertIdentifier(), assertOnlyFields() (+66 more)

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
Cohesion: 0.29
Nodes (9): AppServicesContext, AppServicesProvider(), createAppServices(), useAppTheme(), DEMO_DATASET, createShowcaseServices(), NO_ACTIONS, ShowcaseApp() (+1 more)

### Community 37 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, allowSyntheticDefaultImports, checkJs, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+15 more)

### Community 38 - "DashboardLayout.jsx"
Cohesion: 0.07
Nodes (31): useSessionBrokerAccounts(), useSessionWallet(), WalletTopUpDialog(), DashboardLayout(), Logo(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent() (+23 more)

### Community 39 - "2. Wrappers — `src/components/app/*.jsx`"
Cohesion: 0.08
Nodes (24): 0.1 Fix `--win` / `--loss` (still the old, failing values), 0.2 Scope the heading rules, 0.3 Sanctioned primitive edits — the complete list, 0. Prerequisites — land these before the first wrapper, 1.1 Surfaces, 1.2 Type roles, 1.3 Spacing and density, 1.4 State encoding (+16 more)

### Community 41 - "SectionCard.jsx"
Cohesion: 0.21
Nodes (11): DELTA_CLASS, DELTA_SIGN, TONE_CLASS, Card(), CardAction(), CardContent(), CardDescription(), CardFooter() (+3 more)

### Community 42 - "EmptyState.jsx"
Cohesion: 0.33
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 43 - "AnalyticsPage.tsx"
Cohesion: 0.09
Nodes (33): AnalyticsDateRange(), AnalyticsDateRangeProps, AnalyticsDateRangeValue, DateErrors, formatAnalyticsRange(), todayDateInputValue(), validateRange(), validDateInput() (+25 more)

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
Cohesion: 0.08
Nodes (29): ANCHOR_UTC, buildTrade(), CONFLUENCE, CONVICTION, dateForDay(), DEMO_BROKER_ACCOUNTS, DEMO_DISPLAY_NAME, DEMO_EMAIL (+21 more)

### Community 48 - "vercel.json"
Cohesion: 0.40
Nodes (4): crons, headers, redirects, rewrites

### Community 51 - "_entitlementMiddleware.test.js"
Cohesion: 0.09
Nodes (28): assertEmailVerified(), getUidFromContext(), isEmailVerificationEnforced(), isSyncAllowed(), verifyIdToken(), assertPro(), ProGateOptions, requireAuth() (+20 more)

### Community 55 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, chart.js, dotenv, @firecms/neat, dependencies, @base-ui/react, chart.js, dotenv (+1 more)

### Community 57 - "decoders.ts"
Cohesion: 0.07
Nodes (79): AccessTokenProvider, ADMIN_API_BASE_URL, ADMIN_API_TIMEOUT_MS, AdminApiError, AdminApiErrorCategory, AdminApiErrorOptions, adminRequest(), AdminRequestOptions (+71 more)

### Community 58 - "_security.ts"
Cohesion: 0.17
Nodes (14): handleRemindExpiry(), assertCron(), assertRequiredConfig(), escapeHtml(), isRecaptchaConfigured(), isValidAccountId(), isValidUid(), RecaptchaResult (+6 more)

### Community 59 - "App.jsx"
Cohesion: 0.12
Nodes (20): App(), AuthSyncFailure(), LinkPeek(), ScrollProgress(), clearUxState(), shouldSkip(), useRouteExperience(), isPublicNavbarPath() (+12 more)

### Community 60 - "Production Operations & Maintenance Guide — xaujournal"
Cohesion: 0.11
Nodes (18): 1. Secrets Management & Rotation Plan, 2. Production Monitoring & Logging Setup, 3. Reliability & Downtime Mitigation, 4. Scaling Optimization, 5. Emergency Manual Deployments, A. Firebase Admin SDK / Service Account Rotation, 🔔 Alerting Thresholds, B. MetaApi Cloud Token Rotation (+10 more)

### Community 65 - "XAU Journal × MetaApi — Architecture"
Cohesion: 0.17
Nodes (11): Backend (Firebase Cloud Functions), Code map, Deploy checklist, Environment variables, Firestore schema, Overview, Security rule, UI flow (Sync page) (+3 more)

### Community 66 - "useUsers.ts"
Cohesion: 0.17
Nodes (14): AccessDraft, AccessField, initialDraft(), toIsoDateTime(), toLocalDateTime(), UserAccessEditor(), UserAccessEditorProps, UserRepository (+6 more)

### Community 83 - "hooks/index.ts"
Cohesion: 0.08
Nodes (36): AnalyticsRepository, PaymentRepository, ReportRepository, AdminApiAvailability, AdminHealthCheck, AdminHealthCheckStatus, CouponCreate, CouponUpdate (+28 more)

### Community 84 - "HIGH"
Cohesion: 0.18
Nodes (11): Attack scenario, Attack scenario, Fix, Fix, Fix, Fix, H-02 — Cloud Functions expose the broker path with no subscription check and no rate limit, H-05 — Unauthenticated reCAPTCHA proxy burns billable assessment quota (+3 more)

### Community 85 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noUnusedLocals (+10 more)

### Community 86 - "migrate-broker-credential-privacy.mjs"
Cohesion: 0.35
Nodes (9): ACCOUNT_CREDENTIAL_FIELDS, USER_CREDENTIAL_FIELDS, initAdmin(), apply, deletionPatch(), main(), ownsAny(), scrubBrokerAccounts() (+1 more)

### Community 87 - "DashboardRightSidebar.jsx"
Cohesion: 0.09
Nodes (23): CurrencyConverter(), ratesCache, CONFIDENCE_SCALE, CONFLUENCE, EMPTY_SETUPS, GRADES, MOODS, SESSION_OPTIONS (+15 more)

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
Nodes (30): addBreakdownValue(), AdminDateRange, aggregateSummary(), analyticsTrade(), boundedRangeDocs(), cursorFingerprint(), decodeTradeCursor(), encodeTradeCursor() (+22 more)

### Community 95 - "useBrokerAccounts.js"
Cohesion: 0.32
Nodes (15): dropLocalAccount(), hasServerLogin(), useBrokerAccounts(), addAccount(), hasSessionCredential(), removeAccount(), syncAccount(), accountsKey() (+7 more)

### Community 96 - "marketData.js"
Cohesion: 0.05
Nodes (54): AppProviders(), applyRealPrice(), applyTick(), baselineOf(), LiveMarketWidget(), percentChange(), readYahooQuote(), SPOT_SYMBOLS (+46 more)

### Community 97 - "EditTradeModal.jsx"
Cohesion: 0.11
Nodes (21): EditTradeModal(), ImageViewerModal(), DashboardRightSidebar(), legacySessionPrefill(), TRADE, CustomSelect(), DatePicker(), storage (+13 more)

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
Cohesion: 0.12
Nodes (27): addSessionDelta(), persistBrokerTrades(), now(), chunkedDbGetAll(), handleTradeWebhook(), hashToken(), handleCloseTradeSync(), handleOpenTradeSync() (+19 more)

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
Cohesion: 0.22
Nodes (8): AuthenticatedApp(), AuthenticatedAppContent(), PUBLIC_LEGAL_PATHS, AuthenticatedApp, AuthenticatedRoutes(), PageLoader(), VerifyEmailBanner(), useOnboarding()

### Community 117 - "package.json"
Cohesion: 0.29
Nodes (6): author, description, name, private, type, version

### Community 118 - "sidebar.tsx"
Cohesion: 0.07
Nodes (30): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle(), Sidebar() (+22 more)

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
Cohesion: 0.33
Nodes (4): archiveSetup, createSetup, SETUPS, TRADE

### Community 123 - "useMutationConfirmation.ts"
Cohesion: 0.43
Nodes (7): AdminMutationConfirmation, assertMutationReason(), mutationReasonError(), ConfirmationAction, MutationConfirmationState, PendingConfirmation, useMutationConfirmation()

### Community 124 - "DashboardLayout.sidebarWiring.test.js"
Cohesion: 0.83
Nodes (3): declaredProps(), passedProps(), withoutComments()

### Community 125 - "models/index.ts"
Cohesion: 0.05
Nodes (56): reasonedBody(), requestData(), AdminHealthRepository, CouponRepository, OverviewRepository, reportPatch(), reportStatus(), SettingsRepository (+48 more)

### Community 128 - "admin-dashboard/package.json"
Cohesion: 0.06
Nodes (34): dependencies, firebase, lucide-react, react, react-dom, react-router-dom, devDependencies, @types/node (+26 more)

### Community 129 - "AuthContext.tsx"
Cohesion: 0.12
Nodes (25): AuthenticatedLayout(), ADMIN_EMAIL, ADMIN_UID, AdminAdmissionError, AdminAdmissionFailure, admissionErrorMessage(), verifyAdminAdmission(), AdminLogin() (+17 more)

### Community 130 - "capture-shots.mjs"
Cohesion: 0.14
Nodes (19): BASE_URL, BROWSERS, captureRoute(), Cdp, debug(), encode(), freePort(), launchBrowser() (+11 more)

### Community 131 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, checkJs, lib, noEmit, paths, strict, types (+7 more)

### Community 132 - "inMemoryRepositories.js"
Cohesion: 0.13
Nodes (6): SubscriptionRepository, WalletRepository, channel(), createInMemoryRepositories(), createShowcaseStore(), InMemoryWalletRepository

### Community 133 - "useAppServices"
Cohesion: 0.24
Nodes (9): useAppServices(), AuthenticatedSessionProvider(), BrokerAccountsContext, WalletContext, useJournals(), byDateDesc(), mergeTrades(), useTrades() (+1 more)

### Community 134 - "BlogArticlePage.jsx"
Cohesion: 0.19
Nodes (14): getArticle(), applyArticleSEO(), BlogArticlePage(), escapeRegExp(), formatUpdated(), Headline(), NOTES, readRail() (+6 more)

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
Cohesion: 0.24
Nodes (12): AnalyticsPage, AnnouncementsPage, App(), CouponsPage, OverviewPage, PaymentsPage, ReportsPage, SettingsPage (+4 more)

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
Cohesion: 0.31
Nodes (7): EMPTY_SETUPS, Popover(), PopoverContent(), PopoverDescription(), PopoverHeader(), PopoverTitle(), PopoverTrigger()

### Community 147 - "useAnnouncements.ts"
Cohesion: 0.21
Nodes (11): AnnouncementRepository, Announcement, AnnouncementCreate, AnnouncementLevel, AnnouncementListParams, AnnouncementStatus, AnnouncementTarget, AnnouncementUpdate (+3 more)

### Community 149 - "useSetups.js"
Cohesion: 0.10
Nodes (28): effectiveSlug(), findSlugOwner(), legacyTag(), ManageSetupsDialog(), trimmed(), effectiveSlug(), SetupCombobox(), actionIn() (+20 more)

### Community 150 - "PricingPage.test.jsx"
Cohesion: 0.25
Nodes (4): authState, navigate, recordProAcceptance, startCheckout

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

## Knowledge Gaps
- **805 isolated node(s):** `Repository commands`, `Proxy overrides and diagnostics`, `Admission policy`, `Admin API and CORS`, `Vercel project settings` (+800 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `EditTradeModal.jsx`, `button.tsx`, `DashboardLayout.jsx`, `PublicSite.jsx`, `SectionCard.jsx`, `EmptyState.jsx`, `HistoryPage.jsx`, `sticky-footer.tsx`, `FooterNav.jsx`, `SetupCombobox.jsx`, `DataTable.jsx`, `useSetups.js`, `AnalyticsPage.jsx`, `DashboardRightSidebar.jsx`, `sidebar.tsx`, `lib/utils.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `resolveSessionAt()` connect `_tradeService.ts` to `EditTradeModal.jsx`, `_metaapi-broker.js`, `demoData.js`, `tradeAnalytics.js`, `goldContract.js`, `DashboardRightSidebar.jsx`, `sessionEngine.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `createAdminApi()` connect `_admin.ts` to `api/[...route].ts`, `_adminAnalytics.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createAdminApi()` (e.g. with `publicAuthUser()` and `requestIdMiddleware()`) actually correct?**
  _`createAdminApi()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Repository commands`, `Proxy overrides and diagnostics`, `Admission policy` to the rest of the system?**
  _805 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `disciplineRules.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._
- **Should `BrokerSync.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08478513356562137 - nodes in this community are weakly interconnected._