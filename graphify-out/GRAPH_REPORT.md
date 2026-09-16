# Graph Report - xaujournal  (2026-09-16)

## Corpus Check
- 424 files · ~551,129 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3048 nodes · 6666 edges · 203 communities (146 shown, 57 thin omitted)
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
- cn
- devDependencies
- PublicSite.jsx
- inMemoryRepositories.js
- _metaapi-broker.js
- admin-dashboard/src/components/ui/sidebar.tsx
- ContactPage.jsx
- Hero.jsx
- PricingPage.jsx
- HistoryPage.jsx
- compilerOptions
- LandingPage.jsx
- _shared.tsx
- components.json
- goldSessions.js
- tradeAnalytics.js
- firebaseTradeRepository.test.js
- DataTable.jsx
- FirebaseBrokerRepository.js
- AnalyticsPage.jsx
- components/index.ts
- sessionEngine.js
- MEDIUM
- LogTradePage.jsx
- BlogsPage.jsx
- firebase.js
- _admin.ts
- MT4/MT5 Broker Login Sync Implementation
- grant-admin.mjs
- compilerOptions
- JournalRepository
- ShowcaseApp.jsx
- class-variance-authority
- compilerOptions
- demoData.js
- 2. Wrappers — `src/components/app/*.jsx`
- client.ts
- src/lib/utils.ts
- _paypal.ts
- AnalyticsPage.tsx
- check-bundle-budget.mjs
- vite.config.js
- sticky-footer.tsx
- capture-shots.mjs
- vercel.json
- firebase.d.ts
- tradeConfig.js
- _entitlementMiddleware.test.js
- .agents/skills/run-xaujournal/smoke.mjs
- .claude/skills/run-xaujournal/smoke.mjs
- dependencies
- firebase
- decoders.ts
- api/[...route].ts
- App.jsx
- Production Operations & Maintenance Guide — xaujournal
- @google-cloud/storage
- SettingsPage.tsx
- UserDetailPage.tsx
- overrides
- XAU Journal × MetaApi — Architecture
- _tradeService.ts
- react-chartjs-2
- react-dom
- react-router-dom
- resend
- dependencies
- tw-animate-css
- @vercel/analytics
- admin-dashboard/components.json
- @vercel/speed-insights
- hooks/index.ts
- HIGH
- compilerOptions
- _firebase.js
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
- migrate-performance-data.mjs
- rules/graphify.md
- workflows/graphify.md
- C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out
- H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset
- FirebaseTradeRepository.js
- html2canvas
- H-04 — Unauthenticated `/api/contact` writes to Firestore, sends email, and injects raw HTML into the ops inbox
- metaapi.cloud-sdk
- H-03 — Rate limiting keys on a client-suppliable header
- M-03 — Lemon Squeezy webhook: non-constant-time signature check, no replay protection
- app/AuthenticatedApp.jsx
- WalletRepository
- admin-dashboard/src/components/ui/dropdown-menu.tsx
- @google-cloud/recaptcha-enterprise
- react
- @fontsource-variable/geist
- useMutationConfirmation.ts
- react-bootstrap-icons
- DashboardLayout.jsx
- LogTradePage.discipline.test.jsx
- Admin Dashboard Adversarial Security Review — 2026-08-29
- ErrorBoundary.jsx
- HistoryPage.setupWiring.test.jsx
- models/index.ts
- DashboardLayout.sidebarWiring.test.js
- IsoDateString
- devDependencies
- eslint-plugin-react-hooks
- scripts
- AuthContext.tsx
- getPlatformAnalytics
- compilerOptions
- createAppServices.js
- useAppServices
- BlogArticlePage.jsx
- smoke-local.mjs
- consolidateBrokerConnect
- PayPalSubscriptionStatus.jsx
- pages/index.ts
- TradeRepository
- _admin.security.test.js
- build-og.mjs
- dev-admin.mjs
- useTrades.editTrade.test.jsx
- DashboardLayout.profileMenu.test.js
- eslint
- SetupCombobox.jsx
- useAnnouncements.ts
- useBrokerAccounts.adopt.test.jsx
- useSetups.js
- _paypalSubscriptions.ts
- vitest
- shots/README.md
- EditTradeModal.submit.test.jsx
- BrokerRepository
- InMemoryJournalRepository
- dev-admin-api.mjs
- admin-dashboard/README.md
- package.json
- admin-dashboard/vercel.json
- Admin console operations
- deploy-both.mjs
- admin-dashboard/package.json
- LiveMarketWidget.jsx
- SettingsPage.resetTerminal.test.jsx
- compilerOptions
- firebase-functions
- cn
- firebase
- @types/react-dom
- vite.config.ts
- vercel
- _adminUsers.ts
- couponPatch
- tailwindcss
- admin-dashboard/src/components/ui/sheet.tsx
- LiveMarketWidget.test.jsx
- lucide-react
- _adminErrors.ts
- _admin.test.js
- react-dom
- useAppTheme
- chart.js
- ManageSetupsDialog.test.jsx
- useChartTheme
- admin-dashboard/src/lib/utils.ts
- dotenv
- firebase-admin
- @firecms/neat
- framer-motion
- @google-cloud/firestore
- @testing-library/jest-dom
- hono
- clsx
- lucide-react
- vite
- tailwind-merge
- sharp
- terser
- @vitejs/plugin-react

## God Nodes (most connected - your core abstractions)
1. `cn()` - 211 edges
2. `cn()` - 106 edges
3. `createAdminApi()` - 42 edges
4. `IsoDateString` - 31 edges
5. `Button()` - 31 edges
6. `cx()` - 29 edges
7. `formatDate()` - 24 edges
8. `record()` - 23 edges
9. `useToast()` - 23 edges
10. `scripts` - 22 edges

## Surprising Connections (you probably didn't know these)
- `publicRecentTrade()` --calls--> `getTradeSessionCode()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `aggregateSummary()` --calls--> `analyticsDeltaForTrades()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `timeSeries()` --indirect_call--> `isTradeAnalyticsEligible()`  [INFERRED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `getUserAnalytics()` --calls--> `getTradeSessionCode()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `getUserAnalytics()` --calls--> `getTradeSetupKey()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js

## Import Cycles
- None detected.

## Communities (203 total, 57 thin omitted)

### Community 0 - "disciplineRules.js"
Cohesion: 0.08
Nodes (23): sameRules(), useDisciplineSettings(), earliestDayKey(), EMPTY_TRADES, useDisciplineViolations(), clampRuleValue(), dayKeyMidnightMs(), DEFAULT_DISCIPLINE_RULES (+15 more)

### Community 1 - "BrokerSync.jsx"
Cohesion: 0.09
Nodes (28): BrokerLogo(), BrokerSync(), handleConnect(), handleManualSync(), handleRemove(), BrokerWall(), PLATFORMS, BROKER_CHIP_MARKS (+20 more)

### Community 2 - "src/components/ui/button.tsx"
Cohesion: 0.07
Nodes (34): AuthenticatedOverlays(), AppDialog(), SIZE_CLASS, VETO_REASONS, ConsentModal(), PLAN_LINES, OnboardingModal(), PricingModal() (+26 more)

### Community 3 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, admin:build, admin:dev, admin:grant, admin:list, build, build:budget, deploy (+14 more)

### Community 4 - "cn"
Cohesion: 0.05
Nodes (57): Alert(), AlertAction(), AlertDescription(), AlertTitle(), alertVariants, AlertDialogMedia(), AlertDialogOverlay(), Avatar() (+49 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (27): autoprefixer, @eslint/js, eslint-plugin-react-refresh, globals, jsdom, devDependencies, autoprefixer, @eslint/js (+19 more)

### Community 6 - "PublicSite.jsx"
Cohesion: 0.18
Nodes (12): FAQ(), ArrowOut(), Panel(), SectionHead(), Shot(), TextLink(), SHOT_HEIGHT, SHOT_WIDTH (+4 more)

### Community 7 - "inMemoryRepositories.js"
Cohesion: 0.09
Nodes (11): byDateDesc(), channel(), clone(), createInMemoryRepositories(), createShowcaseStore(), docSnapshot(), InMemoryBrokerRepository, InMemorySetupRepository (+3 more)

### Community 8 - "_metaapi-broker.js"
Cohesion: 0.17
Nodes (19): combineEntryDeals(), deleteMetaApiAccount(), fetchBrokerTrades(), fetchMetaApiDeals(), finiteNumber(), getApi(), isBuyDeal(), isTradeDeal() (+11 more)

### Community 9 - "admin-dashboard/src/components/ui/sidebar.tsx"
Cohesion: 0.07
Nodes (33): Separator(), Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction() (+25 more)

### Community 10 - "ContactPage.jsx"
Cohesion: 0.13
Nodes (20): ContactPage, BROKER_COUNTS, buildPayload(), COMING_SOON_NAMES, ContactPage(), describedBy(), EMPTY_FORM, FIELD_IDS (+12 more)

### Community 11 - "Hero.jsx"
Cohesion: 0.09
Nodes (28): Chapters, DESK_NAMES, initialRailId(), RAIL, RAIL_TO_DESK, ReadChapterRail(), SessionFigures(), signClass() (+20 more)

### Community 12 - "PricingPage.jsx"
Cohesion: 0.07
Nodes (28): AppRoutes(), isShowcaseRequested(), LandingPage, Login, PricingPage, PrivacyPolicyPage, PUBLIC_NAVBAR_PATHS, RefundPolicyPage (+20 more)

### Community 13 - "HistoryPage.jsx"
Cohesion: 0.07
Nodes (42): useSessionBrokerAccounts(), useSessionWallet(), AnalyticsPage, BrokerSync, CalendarPage, HistoryPage, JournalPage, LogTradePage (+34 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, baseUrl, ignoreDeprecations, jsx, lib, module, moduleDetection (+18 more)

### Community 15 - "LandingPage.jsx"
Cohesion: 0.10
Nodes (33): PricingBridge(), Proof(), STEPS, PageSEO(), useDeskReveal(), PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE, applyArticleSEO() (+25 more)

### Community 16 - "_shared.tsx"
Cohesion: 0.14
Nodes (31): useAdminHealth(), useAnnouncements(), useOverview(), AnnouncementRecord, AnnouncementsPage(), blankCoupon, CouponRecord, OverviewPage() (+23 more)

### Community 17 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 18 - "goldSessions.js"
Cohesion: 0.11
Nodes (34): listCities(), normalizeSession(), RAIL_FILL, segmentState(), SessionGlyph(), SessionRail(), SATURDAY_1200_UTC, TUESDAY_0800_UTC (+26 more)

### Community 19 - "tradeAnalytics.js"
Cohesion: 0.13
Nodes (24): DirectionCell(), CLOSE_FIELDS, emptySessionAnalytics(), emptySessionBucket(), emptySessionDelta(), ENTRY_FIELDS, finiteOrNull(), followMerge() (+16 more)

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
Cohesion: 0.07
Nodes (47): StatCard(), TradeShareCard, useMonthTrades(), PRIMARY_SESSIONS, primarySessionForCode(), SESSION_LABELS, getTradeStrategyTags(), isShortDirection() (+39 more)

### Community 24 - "components/index.ts"
Cohesion: 0.07
Nodes (56): AdminNavItem, AdminShell(), AdminShellProps, defaultAdminNavigation, routeIsActive(), Button, ButtonProps, ButtonSize (+48 more)

### Community 25 - "sessionEngine.js"
Cohesion: 0.10
Nodes (26): baseTrade, TradeEntity, LogTradeUseCase, CODE_HUBS, EMPTY, HUB_ORDER, HUB_PRIORITY, hubWindowMs() (+18 more)

### Community 26 - "MEDIUM"
Cohesion: 0.12
Nodes (16): Fix, Fix, Fix, Fix, Fix, Fix, Fix, M-01 — CSP permits `'unsafe-inline'` and `'unsafe-eval'` (+8 more)

### Community 27 - "LogTradePage.jsx"
Cohesion: 0.15
Nodes (13): SQUARE_STATE, StatusSquare(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ToggleGroup() (+5 more)

### Community 28 - "BlogsPage.jsx"
Cohesion: 0.10
Nodes (16): BlogsPage, Arrow(), articles, articles, studyArticles, studyCategories, articles, COUNTS (+8 more)

### Community 29 - "firebase.js"
Cohesion: 0.29
Nodes (8): db, app, auth, facebookProvider, firebaseConfig, googleProvider, fetchCountry(), Login()

### Community 30 - "_admin.ts"
Cohesion: 0.13
Nodes (33): actorFrom(), AdminActor, adminActorRateLimit(), ANNOUNCEMENT_FIELDS, assertIdentifier(), auditData(), auditDataFor(), auditSensitiveRead() (+25 more)

### Community 31 - "MT4/MT5 Broker Login Sync Implementation"
Cohesion: 0.04
Nodes (45): 1. **Broker Service** (`api/_metaapi-broker.js`), 1. **MT5SyncSetup** (`src/components/MT5SyncSetup.jsx`), 2. **API Endpoint** (`api/broker-login-sync.js`), 2. **BrokerLoginSync** (`src/components/BrokerLoginSync.jsx`), 3. **Cron Job** (`api/cron/broker-sync-poller.js`), 3. **useBrokerAccounts Hook** (`src/hooks/useBrokerAccounts.js`), Add Broker Account, API Authentication (+37 more)

### Community 32 - "grant-admin.mjs"
Cohesion: 0.33
Nodes (4): args, identity, list, revoke

### Community 33 - "compilerOptions"
Cohesion: 0.17
Nodes (11): vite.config.js, compilerOptions, allowJs, allowSyntheticDefaultImports, composite, module, moduleResolution, noEmit (+3 more)

### Community 35 - "ShowcaseApp.jsx"
Cohesion: 0.15
Nodes (17): AppServicesContext, AppServicesProvider(), createAppServices(), FREE_SUBSCRIPTION, isPayPalApprovalUrl(), newIdempotencyKey(), useSubscription(), DEMO_DATASET (+9 more)

### Community 37 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowJs, allowSyntheticDefaultImports, checkJs, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+15 more)

### Community 38 - "demoData.js"
Cohesion: 0.10
Nodes (24): ANCHOR_UTC, buildTrade(), CONFLUENCE, CONVICTION, dateForDay(), DEMO_BROKER_ACCOUNTS, DEMO_JOURNALS, DEMO_NET_PNL (+16 more)

### Community 39 - "2. Wrappers — `src/components/app/*.jsx`"
Cohesion: 0.08
Nodes (24): 0.1 Fix `--win` / `--loss` (still the old, failing values), 0.2 Scope the heading rules, 0.3 Sanctioned primitive edits — the complete list, 0. Prerequisites — land these before the first wrapper, 1.1 Surfaces, 1.2 Type roles, 1.3 Spacing and density, 1.4 State encoding (+16 more)

### Community 40 - "client.ts"
Cohesion: 0.11
Nodes (24): AccessTokenProvider, ADMIN_API_BASE_URL, ADMIN_API_TIMEOUT_MS, AdminApiError, AdminApiErrorOptions, adminRequest(), AdminRequestOptions, AdminResponse (+16 more)

### Community 41 - "src/lib/utils.ts"
Cohesion: 0.13
Nodes (15): DELTA_CLASS, DELTA_SIGN, TONE_CLASS, Badge(), badgeVariants, Card(), CardAction(), CardContent() (+7 more)

### Community 42 - "_paypal.ts"
Cohesion: 0.21
Nodes (16): accessToken(), apiBase(), createPayPalSubscription(), getPayPalClientId(), getPayPalEnvironment(), PayPalEnvironment, PayPalRequestOptions, PayPalWebhookHeaders (+8 more)

### Community 43 - "AnalyticsPage.tsx"
Cohesion: 0.09
Nodes (35): AnalyticsDateRange(), AnalyticsDateRangeProps, AnalyticsDateRangeValue, DateErrors, formatAnalyticsRange(), todayDateInputValue(), validateRange(), validDateInput() (+27 more)

### Community 44 - "check-bundle-budget.mjs"
Cohesion: 0.25
Nodes (8): budgets, directory, eager, eagerKb, files, gzipKb(), html, htmlPath

### Community 45 - "vite.config.js"
Cohesion: 0.28
Nodes (7): CHART_VENDOR, __dirname, EAGER_FORBIDDEN, manualChunks(), normalizeId(), packageOf(), REACT_VENDOR

### Community 46 - "sticky-footer.tsx"
Cohesion: 0.17
Nodes (8): AnimatedContainerProps, FooterLink, FooterLinkGroup, footerLinkGroups, socialLinks, StickyFooter(), StickyFooterProps, mocks

### Community 47 - "capture-shots.mjs"
Cohesion: 0.14
Nodes (19): BASE_URL, BROWSERS, captureRoute(), Cdp, debug(), encode(), freePort(), launchBrowser() (+11 more)

### Community 48 - "vercel.json"
Cohesion: 0.40
Nodes (4): crons, headers, redirects, rewrites

### Community 51 - "_entitlementMiddleware.test.js"
Cohesion: 0.09
Nodes (28): assertEmailVerified(), getUidFromContext(), isEmailVerificationEnforced(), isSyncAllowed(), verifyIdToken(), assertPro(), ProGateOptions, requireAuth() (+20 more)

### Community 55 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, @fontsource-variable/newsreader, dependencies, @base-ui/react, @fontsource-variable/newsreader, @radix-ui/react-slot, @vercel/kv, @radix-ui/react-slot (+1 more)

### Community 57 - "decoders.ts"
Cohesion: 0.14
Nodes (52): ANNOUNCEMENT_LEVELS, ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_TARGETS, announcementTarget(), COUPON_TYPES, decodeAdminHealth(), decodeAnalytics(), decodeAnnouncement() (+44 more)

### Community 58 - "api/[...route].ts"
Cohesion: 0.09
Nodes (32): getClientIp(), adminAllowedOrigins, allowedOrigins, DEFAULT_SCOPE, RATE_LIMIT_SCOPES, rateLimitMiddleware(), secureHeadersMiddleware, resend (+24 more)

### Community 59 - "App.jsx"
Cohesion: 0.11
Nodes (21): App(), AuthSyncFailure(), LinkPeek(), ScrollProgress(), clearUxState(), shouldSkip(), useRouteExperience(), isPublicNavbarPath() (+13 more)

### Community 60 - "Production Operations & Maintenance Guide — xaujournal"
Cohesion: 0.10
Nodes (19): 1. Secrets Management & Rotation Plan, 2. Production Monitoring & Logging Setup, 3. Reliability & Downtime Mitigation, 4. Scaling Optimization, 5. Emergency Manual Deployments, A. Firebase Admin SDK / Service Account Rotation, 🔔 Alerting Thresholds, B. MetaApi Cloud Token Rotation (+11 more)

### Community 62 - "SettingsPage.tsx"
Cohesion: 0.10
Nodes (20): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+12 more)

### Community 63 - "UserDetailPage.tsx"
Cohesion: 0.16
Nodes (22): AdminErrorDescription, canonicalUserId(), describeAdminError(), displayUserName(), BreakdownTable(), percent(), pointWinRate(), UserAnalyticsSection() (+14 more)

### Community 64 - "overrides"
Cohesion: 0.11
Nodes (18): overrides, axios, braces, cross-spawn, crypto-js, elliptic, esbuild, fast-xml-parser (+10 more)

### Community 65 - "XAU Journal × MetaApi — Architecture"
Cohesion: 0.17
Nodes (11): Backend (Firebase Cloud Functions), Code map, Deploy checklist, Environment variables, Firestore schema, Overview, Security rule, UI flow (Sync page) (+3 more)

### Community 66 - "_tradeService.ts"
Cohesion: 0.31
Nodes (10): now(), requeuePausedAccounts(), handleRevokeExpired(), handleTradeWebhook(), handleCloseTradeSync(), handleOpenTradeSync(), invalidateApiKeyCache(), invalidateUserCache() (+2 more)

### Community 71 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority, clsx, next-themes, radix-ui, react, react-router-dom, sonner (+9 more)

### Community 74 - "admin-dashboard/components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 83 - "hooks/index.ts"
Cohesion: 0.07
Nodes (43): AdminHealthRepository, AnalyticsRepository, CouponRepository, OverviewRepository, PaymentRepository, ReportRepository, SettingsRepository, SubscriptionRepository (+35 more)

### Community 84 - "HIGH"
Cohesion: 0.18
Nodes (11): Attack scenario, Attack scenario, Fix, Fix, Fix, Fix, H-02 — Cloud Functions expose the broker path with no subscription check and no rate limit, H-05 — Unauthenticated reCAPTCHA proxy burns billable assessment quota (+3 more)

### Community 85 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noUnusedLocals (+10 more)

### Community 86 - "_firebase.js"
Cohesion: 0.21
Nodes (13): ACCOUNT_CREDENTIAL_FIELDS, USER_CREDENTIAL_FIELDS, db, initAdmin(), isDbReady(), app, mockKvStore, apply (+5 more)

### Community 87 - "marketData.test.js"
Cohesion: 0.17
Nodes (11): getMarketDataHealth(), subscribeMarketDataHealth(), useMarketDataHealth(), driveProxyDown(), httpStatus(), isProxyUrl(), NOW, route() (+3 more)

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
Cohesion: 0.18
Nodes (26): addBreakdownValue(), AdminDateRange, aggregateSummary(), analyticsTrade(), cursorFingerprint(), decodeTradeCursor(), encodeTradeCursor(), finishBreakdown() (+18 more)

### Community 95 - "useBrokerAccounts.js"
Cohesion: 0.32
Nodes (15): dropLocalAccount(), hasServerLogin(), useBrokerAccounts(), addAccount(), hasSessionCredential(), removeAccount(), syncAccount(), accountsKey() (+7 more)

### Community 96 - "marketData.js"
Cohesion: 0.15
Nodes (25): ABORTED, beginShared(), chartQuery(), directJson(), fetchSpotPrice(), fetchYahooChart(), health, inFlight (+17 more)

### Community 97 - "DashboardRightSidebar.jsx"
Cohesion: 0.09
Nodes (29): EditTradeModal(), ImageViewerModal(), CONFIDENCE_SCALE, CONFLUENCE, DashboardRightSidebar(), EMPTY_SETUPS, GRADES, legacySessionPrefill() (+21 more)

### Community 98 - "migrate-performance-data.mjs"
Cohesion: 0.22
Nodes (9): apply, args, main(), maxUsers, migrateBrokerJobs(), mode, startAfterBrokerPath, startAfterUser (+1 more)

### Community 101 - "C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out"
Cohesion: 0.50
Nodes (4): Attack scenarios, C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out, CRITICAL, Fix

### Community 102 - "H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset"
Cohesion: 0.67
Nodes (3): Attack scenario, Fix, H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset

### Community 103 - "FirebaseTradeRepository.js"
Cohesion: 0.11
Nodes (26): addSessionDelta(), persistBrokerTrades(), chunkedDbGetAll(), migrateAnalytics(), dateContradicts(), ENTRY_TIERS, entryInstant(), FirebaseTradeRepository (+18 more)

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

### Community 111 - "admin-dashboard/src/components/ui/dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 115 - "useMutationConfirmation.ts"
Cohesion: 0.36
Nodes (8): reasonedBody(), AdminMutationConfirmation, assertMutationReason(), mutationReasonError(), ConfirmationAction, MutationConfirmationState, PendingConfirmation, useMutationConfirmation()

### Community 118 - "DashboardLayout.jsx"
Cohesion: 0.05
Nodes (51): Logo(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem() (+43 more)

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

### Community 123 - "models/index.ts"
Cohesion: 0.12
Nodes (15): buildAdminQuery(), requestCollection(), requestData(), requestDataWithMetadata(), reportPatch(), reportStatus(), Announcement, Paginated (+7 more)

### Community 124 - "DashboardLayout.sidebarWiring.test.js"
Cohesion: 0.83
Nodes (3): declaredProps(), passedProps(), withoutComments()

### Community 125 - "IsoDateString"
Cohesion: 0.06
Nodes (46): AdminHealth, AdminHealthCheck, AdminHealthCheckStatus, Analytics, AnalyticsDateRange, AnalyticsParams, AnalyticsTimeSeriesPoint, AnnouncementLevel (+38 more)

### Community 126 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript, vite (+9 more)

### Community 128 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, preview, smoke:local, typecheck

### Community 129 - "AuthContext.tsx"
Cohesion: 0.12
Nodes (25): AuthenticatedLayout(), ADMIN_EMAIL, ADMIN_UID, AdminAdmissionError, AdminAdmissionFailure, admissionErrorMessage(), verifyAdminAdmission(), AdminLogin() (+17 more)

### Community 130 - "getPlatformAnalytics"
Cohesion: 0.39
Nodes (7): boundedRangeDocs(), getPlatformAnalytics(), platformSeries(), isSettledPaymentStatus(), normalizedPaymentStatus(), SETTLED_PAYMENT_STATUS_SET, SETTLED_PAYMENT_STATUSES

### Community 131 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, checkJs, lib, noEmit, paths, strict, types (+7 more)

### Community 132 - "createAppServices.js"
Cohesion: 0.16
Nodes (3): SubscriptionRepository, ResetTradesUseCase, FirebaseSubscriptionRepository

### Community 133 - "useAppServices"
Cohesion: 0.24
Nodes (9): useAppServices(), AuthenticatedSessionProvider(), BrokerAccountsContext, WalletContext, useJournals(), byDateDesc(), mergeTrades(), useTrades() (+1 more)

### Community 134 - "BlogArticlePage.jsx"
Cohesion: 0.15
Nodes (16): BlogArticlePage, NotFoundPage, getArticle(), BlogArticlePage(), escapeRegExp(), formatUpdated(), Headline(), NOTES (+8 more)

### Community 135 - "smoke-local.mjs"
Cohesion: 0.30
Nodes (10): checkApi(), checkUi(), fetchChecked(), LOOPBACK_HOSTS, main(), parseApiPath(), parseLocalUiUrl(), pass() (+2 more)

### Community 136 - "consolidateBrokerConnect"
Cohesion: 0.22
Nodes (13): deletionPatch(), AccountLockResult, cachedJson(), inflight, sleep(), withAccountLock(), withRetryBudget(), consolidateBrokerConnect() (+5 more)

### Community 137 - "PayPalSubscriptionStatus.jsx"
Cohesion: 0.39
Nodes (7): PayPalStatus, copyFor(), FINAL_STATUSES, normalizeStatus(), PayPalSubscriptionStatus(), planLabel(), recordFrom()

### Community 138 - "pages/index.ts"
Cohesion: 0.21
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
Cohesion: 0.18
Nodes (11): effectiveSlug(), EMPTY_SETUPS, SetupCombobox(), CATALOG, DatePicker(), Popover(), PopoverContent(), PopoverDescription() (+3 more)

### Community 147 - "useAnnouncements.ts"
Cohesion: 0.38
Nodes (6): AnnouncementRepository, AnnouncementCreate, AnnouncementUpdate, CreateAnnouncementInput, DeleteAnnouncementInput, UpdateAnnouncementInput

### Community 149 - "useSetups.js"
Cohesion: 0.18
Nodes (20): effectiveSlug(), findSlugOwner(), legacyTag(), ManageSetupsDialog(), trimmed(), compareSetups(), effectiveSlug(), findSlugOwner() (+12 more)

### Community 150 - "_paypalSubscriptions.ts"
Cohesion: 0.12
Nodes (40): cancelPayPalSubscription(), getPayPalSubscription(), approvalUrl(), billingCycles(), cancelOwnedPayPalSubscription(), canonicalIdentity(), canonicalPayment(), cents() (+32 more)

### Community 153 - "EditTradeModal.submit.test.jsx"
Cohesion: 0.21
Nodes (10): affectedKeys(), postMerge(), renderModal(), RULES, rulesTradeAllowlist(), SERVER_OWNED, stripComments(), submitEdit() (+2 more)

### Community 156 - "dev-admin-api.mjs"
Cohesion: 0.40
Nodes (3): environmentPath, rootDirectory, vercelEntry

### Community 157 - "admin-dashboard/README.md"
Cohesion: 0.25
Nodes (7): Admin API and CORS, Admission policy, Integration barrels, Local development, Proxy overrides and diagnostics, Repository commands, Vercel project settings

### Community 158 - "package.json"
Cohesion: 0.29
Nodes (6): author, description, name, private, type, version

### Community 159 - "admin-dashboard/vercel.json"
Cohesion: 0.29
Nodes (6): cleanUrls, framework, headers, rewrites, $schema, trailingSlash

### Community 160 - "Admin console operations"
Cohesion: 0.29
Nodes (6): Admin console operations, Deployment order, Grant or revoke access, Retiring the old repository, Security invariant, Vercel projects

### Community 161 - "deploy-both.mjs"
Cohesion: 0.29
Nodes (3): adminDir, args, rootDir

### Community 162 - "admin-dashboard/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 163 - "LiveMarketWidget.jsx"
Cohesion: 0.26
Nodes (12): applyRealPrice(), applyTick(), baselineOf(), LiveMarketWidget(), percentChange(), readYahooQuote(), SPOT_SYMBOLS, tickPollMs() (+4 more)

### Community 165 - "compilerOptions"
Cohesion: 0.29
Nodes (6): compilerOptions, baseUrl, ignoreDeprecations, paths, files, references

### Community 167 - "cn"
Cohesion: 0.13
Nodes (23): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), SelectContent(), SelectGroup() (+15 more)

### Community 172 - "_adminUsers.ts"
Cohesion: 0.25
Nodes (9): AdminDependencies, AdminHttpError, decodeCursor(), DirectoryCursor, encodeCursor(), listAdminUsers(), matchesFilters(), normalizedText() (+1 more)

### Community 173 - "couponPatch"
Cohesion: 0.42
Nodes (11): announcementPatch(), assertOnlyFields(), booleanValue(), boundedString(), couponPatch(), enumValue(), finiteNumber(), nullableIso() (+3 more)

### Community 175 - "admin-dashboard/src/components/ui/sheet.tsx"
Cohesion: 0.16
Nodes (9): Button(), buttonVariants, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+1 more)

### Community 176 - "LiveMarketWidget.test.jsx"
Cohesion: 0.24
Nodes (3): mountWidget(), selectTimeframe(), settle()

### Community 178 - "_adminErrors.ts"
Cohesion: 0.31
Nodes (7): requireAdmin(), AdminErrorCategory, adminErrorResponse(), categoryForStatus(), ensureRequestId(), requestIdMiddleware(), validRequestId()

### Community 179 - "_admin.test.js"
Cohesion: 0.32
Nodes (6): authHeaders, corsApp(), createHarness(), createStore(), VALID_CLAIMS, corsMiddleware()

### Community 181 - "useAppTheme"
Cohesion: 0.32
Nodes (5): AppProviders(), ToastProvider(), ThemeContext, ThemeProvider(), useAppTheme()

### Community 183 - "ManageSetupsDialog.test.jsx"
Cohesion: 0.33
Nodes (5): actionIn(), BY_ID, CATALOG, rowFor(), TRADES

### Community 184 - "useChartTheme"
Cohesion: 0.29
Nodes (6): useChartTheme(), readTokens(), resolveChartTheme(), seriesColor(), TOKEN_NAMES, LogTradePage()

### Community 185 - "admin-dashboard/src/lib/utils.ts"
Cohesion: 0.20
Nodes (8): Badge(), badgeVariants, Input(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger()

## Knowledge Gaps
- **843 isolated node(s):** `checks`, `checks`, `$schema`, `style`, `rsc` (+838 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `DashboardRightSidebar.jsx`, `src/components/ui/button.tsx`, `PublicSite.jsx`, `src/lib/utils.ts`, `HistoryPage.jsx`, `sticky-footer.tsx`, `goldSessions.js`, `tradeAnalytics.js`, `SetupCombobox.jsx`, `DataTable.jsx`, `DashboardLayout.jsx`, `AnalyticsPage.jsx`, `LogTradePage.jsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `auth` connect `firebase.js` to `BrokerSync.jsx`, `DashboardRightSidebar.jsx`, `createAppServices.js`, `PayPalSubscriptionStatus.jsx`, `PricingPage.jsx`, `HistoryPage.jsx`, `DashboardLayout.jsx`, `FirebaseBrokerRepository.js`, `App.jsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `resolveSessionAt()` connect `sessionEngine.js` to `DashboardRightSidebar.jsx`, `_tradeService.ts`, `demoData.js`, `FirebaseTradeRepository.js`, `_metaapi-broker.js`, `goldSessions.js`, `tradeAnalytics.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createAdminApi()` (e.g. with `publicAuthUser()` and `requestIdMiddleware()`) actually correct?**
  _`createAdminApi()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `checks`, `checks`, `$schema` to the rest of the system?**
  _843 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `disciplineRules.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08250355618776671 - nodes in this community are weakly interconnected._
- **Should `BrokerSync.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08780487804878048 - nodes in this community are weakly interconnected._