# Graph Report - xaujournal  (2026-09-16)

## Corpus Check
- 424 files · ~551,129 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3043 nodes · 6617 edges · 195 communities (138 shown, 57 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e27012d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- disciplineRules.js
- BrokerSync.jsx
- PricingPage.jsx
- scripts
- cn
- devDependencies
- PublicSite.jsx
- inMemoryRepositories.js
- _metaapi-broker.js
- admin-dashboard/src/components/ui/sidebar.tsx
- ContactPage.jsx
- Hero.jsx
- AppRoutes.jsx
- HistoryPage.jsx
- compilerOptions
- LandingPage.jsx
- _shared.tsx
- components.json
- goldSessions.js
- decoders.ts
- firebaseTradeRepository.test.js
- DataTable.jsx
- FirebaseBrokerRepository.js
- tradeUtils.js
- components/index.ts
- sessionEngine.js
- MEDIUM
- src/lib/utils.ts
- BlogsPage.jsx
- AppDialog.jsx
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
- SectionCard.jsx
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
- record
- _security.ts
- App.jsx
- Production Operations & Maintenance Guide — xaujournal
- @google-cloud/storage
- SettingsPage.tsx
- src/components/ui/dropdown-menu.tsx
- overrides
- XAU Journal × MetaApi — Architecture
- api/[...route].ts
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
- InMemoryBrokerRepository
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
- tradeAnalytics.js
- html2canvas
- H-04 — Unauthenticated `/api/contact` writes to Firestore, sends email, and injects raw HTML into the ops inbox
- metaapi.cloud-sdk
- H-03 — Rate limiting keys on a client-suppliable header
- M-03 — Lemon Squeezy webhook: non-constant-time signature check, no replay protection
- app/AuthenticatedApp.jsx
- createAppServices.js
- admin-dashboard/src/components/ui/dropdown-menu.tsx
- @google-cloud/recaptcha-enterprise
- react
- @fontsource-variable/geist
- useMutationConfirmation.ts
- react-bootstrap-icons
- useRouteExperience.js
- DashboardLayout.jsx
- LogTradePage
- Admin Dashboard Adversarial Security Review — 2026-08-29
- ErrorBoundary.jsx
- HistoryPage.setupWiring.test.jsx
- api/index.ts
- DashboardLayout.sidebarWiring.test.js
- common.ts
- devDependencies
- eslint-plugin-react-hooks
- scripts
- AuthContext.tsx
- EmptyState.jsx
- compilerOptions
- db
- FloatingDockNavigation.jsx
- BlogArticlePage.jsx
- smoke-local.mjs
- migrate-broker-credential-privacy.mjs
- firebase.js
- pages/index.ts
- TradeRepository
- InMemoryWalletRepository
- build-og.mjs
- dev-admin.mjs
- useAppServices
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
- @vercel/kv
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
- tailwindcss
- admin-dashboard/src/components/ui/sheet.tsx
- LiveMarketWidget.test.jsx
- lucide-react
- react-dom
- Login.jsx
- ToastContext.jsx
- AnalyticsPage.jsx
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
4. `Button()` - 31 edges
5. `cx()` - 29 edges
6. `IsoDateString` - 26 edges
7. `formatDate()` - 24 edges
8. `useToast()` - 23 edges
9. `record()` - 23 edges
10. `AnalyticsPage()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `aggregateSummary()` --calls--> `analyticsDeltaForTrades()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `handleCloseTradeSync()` --calls--> `analyticsUpdate()`  [EXTRACTED]
  api/_tradeService.ts → src/lib/tradeAnalytics.js
- `getUserAnalytics()` --calls--> `getTradeSessionCode()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `publicRecentTrade()` --calls--> `getTradeSessionCode()`  [EXTRACTED]
  api/_adminAnalytics.ts → src/lib/tradeAnalytics.js
- `handleCloseTradeSync()` --calls--> `sessionAnalyticsUpdate()`  [EXTRACTED]
  api/_tradeService.ts → src/lib/tradeAnalytics.js

## Import Cycles
- None detected.

## Communities (195 total, 57 thin omitted)

### Community 0 - "disciplineRules.js"
Cohesion: 0.08
Nodes (25): sameRules(), useDisciplineSettings(), earliestDayKey(), EMPTY_TRADES, useDisciplineViolations(), clampRuleValue(), dayKeyMidnightMs(), DEFAULT_DISCIPLINE_RULES (+17 more)

### Community 1 - "BrokerSync.jsx"
Cohesion: 0.08
Nodes (29): BrokerLogo(), BrokerSync(), handleConnect(), handleManualSync(), handleRemove(), BrokerWall(), PLATFORMS, BROKER_CHIP_MARKS (+21 more)

### Community 2 - "PricingPage.jsx"
Cohesion: 0.07
Nodes (29): AuthenticatedOverlays(), AppDialog(), ConsentModal(), PLAN_LINES, PricingBridge(), OnboardingModal(), PricingModal(), FEATURE_COPY (+21 more)

### Community 3 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, admin:build, admin:dev, admin:grant, admin:list, build, build:budget, deploy (+14 more)

### Community 4 - "cn"
Cohesion: 0.05
Nodes (49): Alert(), AlertAction(), AlertDescription(), AlertTitle(), alertVariants, Avatar(), AvatarBadge(), AvatarFallback() (+41 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (27): autoprefixer, @eslint/js, eslint-plugin-react-refresh, globals, jsdom, devDependencies, autoprefixer, @eslint/js (+19 more)

### Community 6 - "PublicSite.jsx"
Cohesion: 0.26
Nodes (8): ArrowOut(), Panel(), Shot(), SHOT_HEIGHT, SHOT_WIDTH, SHOTS, shotSrc(), InteractiveHoverButton

### Community 7 - "inMemoryRepositories.js"
Cohesion: 0.11
Nodes (8): byDateDesc(), channel(), clone(), createInMemoryRepositories(), createShowcaseStore(), InMemoryJournalRepository, InMemorySetupRepository, InMemoryTradeRepository

### Community 8 - "_metaapi-broker.js"
Cohesion: 0.15
Nodes (19): combineEntryDeals(), deleteMetaApiAccount(), fetchBrokerTrades(), fetchMetaApiDeals(), finiteNumber(), getApi(), isBuyDeal(), isTradeDeal() (+11 more)

### Community 9 - "admin-dashboard/src/components/ui/sidebar.tsx"
Cohesion: 0.07
Nodes (33): Separator(), Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction() (+25 more)

### Community 10 - "ContactPage.jsx"
Cohesion: 0.09
Nodes (19): BROKER_COUNTS, buildPayload(), COMING_SOON_NAMES, ContactPage(), describedBy(), EMPTY_FORM, FIELD_IDS, FIELD_ORDER (+11 more)

### Community 11 - "Hero.jsx"
Cohesion: 0.09
Nodes (29): Chapters, DESK_NAMES, initialRailId(), RAIL, RAIL_TO_DESK, ReadChapterRail(), SessionFigures(), SessionRail() (+21 more)

### Community 12 - "AppRoutes.jsx"
Cohesion: 0.08
Nodes (23): AppRoutes(), AuthenticatedApp, BlogArticlePage, BlogsPage, ContactPage, isShowcaseRequested(), LandingPage, NotFoundPage (+15 more)

### Community 13 - "HistoryPage.jsx"
Cohesion: 0.08
Nodes (37): useSessionBrokerAccounts(), AnalyticsPage, AuthenticatedRoutes(), BrokerSync, CalendarPage, HistoryPage, JournalPage, LogTradePage (+29 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, baseUrl, ignoreDeprecations, jsx, lib, module, moduleDetection (+18 more)

### Community 15 - "LandingPage.jsx"
Cohesion: 0.10
Nodes (33): FAQ(), Proof(), STEPS, PageSEO(), SectionHead(), useDeskReveal(), applyArticleSEO(), applyHeadTags() (+25 more)

### Community 16 - "_shared.tsx"
Cohesion: 0.11
Nodes (44): AdminErrorDescription, canonicalUserId(), describeAdminError(), displayUserName(), BreakdownTable(), percent(), pointWinRate(), UserAnalyticsSection() (+36 more)

### Community 17 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 18 - "goldSessions.js"
Cohesion: 0.10
Nodes (35): listCities(), normalizeSession(), RAIL_FILL, segmentState(), SessionGlyph(), SessionRail(), SATURDAY_1200_UTC, TUESDAY_0800_UTC (+27 more)

### Community 19 - "decoders.ts"
Cohesion: 0.12
Nodes (25): ANNOUNCEMENT_LEVELS, ANNOUNCEMENT_STATUSES, ANNOUNCEMENT_TARGETS, announcementTarget(), COUPON_TYPES, decodeAdminHealth(), decodeHealthCheck(), decodeUserAnalyticsTrade() (+17 more)

### Community 20 - "firebaseTradeRepository.test.js"
Cohesion: 0.18
Nodes (3): fake, logTrade, repository

### Community 21 - "DataTable.jsx"
Cohesion: 0.18
Nodes (14): DataTable(), hideClass(), isEnd(), baseProps, columns, rows, Table(), TableBody() (+6 more)

### Community 22 - "FirebaseBrokerRepository.js"
Cohesion: 0.27
Nodes (6): FirebaseBrokerRepository, adoptBrokerCallable(), callBrokerApi(), connectBrokerCallable(), disconnectBrokerCallable(), syncBrokerTradesCallable()

### Community 23 - "tradeUtils.js"
Cohesion: 0.12
Nodes (26): CurrencyConverter(), ratesCache, TradeShareCard, CURRENCIES, useMonthTrades(), primarySessionForCode(), getTradeStrategyTags(), formatCompact() (+18 more)

### Community 24 - "components/index.ts"
Cohesion: 0.06
Nodes (61): AdminNavItem, AdminShell(), AdminShellProps, defaultAdminNavigation, routeIsActive(), AnalyticsDateRange(), AnalyticsDateRangeProps, AnalyticsDateRangeValue (+53 more)

### Community 25 - "sessionEngine.js"
Cohesion: 0.09
Nodes (27): baseTrade, context, sdk, CODE_HUBS, EMPTY, HUB_ORDER, HUB_PRIORITY, hubWindowMs() (+19 more)

### Community 26 - "MEDIUM"
Cohesion: 0.12
Nodes (16): Fix, Fix, Fix, Fix, Fix, Fix, Fix, M-01 — CSP permits `'unsafe-inline'` and `'unsafe-eval'` (+8 more)

### Community 27 - "src/lib/utils.ts"
Cohesion: 0.14
Nodes (15): DirectionCell(), SQUARE_STATE, StatusSquare(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger() (+7 more)

### Community 28 - "BlogsPage.jsx"
Cohesion: 0.09
Nodes (17): PublicNavbar(), Arrow(), CTAButton(), articles, articles, studyArticles, studyCategories, articles (+9 more)

### Community 29 - "AppDialog.jsx"
Cohesion: 0.13
Nodes (14): SIZE_CLASS, VETO_REASONS, Dialog(), DialogClose(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader() (+6 more)

### Community 30 - "_admin.ts"
Cohesion: 0.05
Nodes (75): actorFrom(), AdminActor, adminActorRateLimit(), AdminDependencies, ANNOUNCEMENT_FIELDS, announcementPatch(), assertIdentifier(), assertOnlyFields() (+67 more)

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
Cohesion: 0.16
Nodes (16): AppServicesProvider(), createAppServices(), FREE_SUBSCRIPTION, isPayPalApprovalUrl(), newIdempotencyKey(), useSubscription(), DEMO_DATASET, DEMO_DISPLAY_NAME (+8 more)

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
Nodes (25): AccessTokenProvider, ADMIN_API_BASE_URL, ADMIN_API_TIMEOUT_MS, AdminApiError, AdminApiErrorOptions, adminRequest(), AdminRequestOptions, AdminResponse (+17 more)

### Community 41 - "SectionCard.jsx"
Cohesion: 0.19
Nodes (11): DELTA_CLASS, DELTA_SIGN, StatCard(), TONE_CLASS, Card(), CardAction(), CardContent(), CardDescription() (+3 more)

### Community 42 - "_paypal.ts"
Cohesion: 0.18
Nodes (19): accessToken(), apiBase(), cancelPayPalSubscription(), createPayPalSubscription(), getPayPalClientId(), getPayPalEnvironment(), getPayPalSubscription(), PayPalEnvironment (+11 more)

### Community 43 - "AnalyticsPage.tsx"
Cohesion: 0.12
Nodes (26): AnalyticsSeries, AnalyticsSeriesTable(), asRecord(), combineOutcomes(), displayValue(), extractAnalyticsSeries(), extractPaymentOutcomes(), finiteNumber() (+18 more)

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
Nodes (9): @base-ui/react, chart.js, @fontsource-variable/newsreader, dependencies, @base-ui/react, chart.js, @fontsource-variable/newsreader, @radix-ui/react-slot (+1 more)

### Community 57 - "record"
Cohesion: 0.31
Nodes (26): decodeAnalytics(), decodeAnnouncement(), decodeCoupon(), decodeFreshness(), decodePayment(), decodePayPalBillingCycles(), decodeReport(), decodeSettings() (+18 more)

### Community 58 - "_security.ts"
Cohesion: 0.11
Nodes (19): getClientIp(), adminAllowedOrigins, allowedOrigins, DEFAULT_SCOPE, RATE_LIMIT_SCOPES, rateLimitMiddleware(), secureHeadersMiddleware, handleRemindExpiry() (+11 more)

### Community 59 - "App.jsx"
Cohesion: 0.14
Nodes (14): App(), AuthSyncFailure(), LinkPeek(), ScrollProgress(), isPublicNavbarPath(), starfieldModeForPath(), MaintenanceNotice(), PublicNavSkeleton() (+6 more)

### Community 60 - "Production Operations & Maintenance Guide — xaujournal"
Cohesion: 0.10
Nodes (19): 1. Secrets Management & Rotation Plan, 2. Production Monitoring & Logging Setup, 3. Reliability & Downtime Mitigation, 4. Scaling Optimization, 5. Emergency Manual Deployments, A. Firebase Admin SDK / Service Account Rotation, 🔔 Alerting Thresholds, B. MetaApi Cloud Token Rotation (+11 more)

### Community 62 - "SettingsPage.tsx"
Cohesion: 0.10
Nodes (20): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogMedia() (+12 more)

### Community 63 - "src/components/ui/dropdown-menu.tsx"
Cohesion: 0.16
Nodes (12): DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator() (+4 more)

### Community 64 - "overrides"
Cohesion: 0.11
Nodes (18): overrides, axios, braces, cross-spawn, crypto-js, elliptic, esbuild, fast-xml-parser (+10 more)

### Community 65 - "XAU Journal × MetaApi — Architecture"
Cohesion: 0.17
Nodes (11): Backend (Firebase Cloud Functions), Code map, Deploy checklist, Environment variables, Firestore schema, Overview, Security rule, UI flow (Sync page) (+3 more)

### Community 66 - "api/[...route].ts"
Cohesion: 0.12
Nodes (30): db, initAdmin(), isDbReady(), now(), resend, app, DELETE, Env (+22 more)

### Community 71 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority, clsx, next-themes, radix-ui, react, react-router-dom, sonner (+9 more)

### Community 74 - "admin-dashboard/components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 83 - "models/index.ts"
Cohesion: 0.09
Nodes (37): CouponCreate, CouponUpdate, ReportUpdate, SystemSettingsUpdate, AdminCollectionState, PagingState, useAdminCollection(), useAdminHealth() (+29 more)

### Community 84 - "HIGH"
Cohesion: 0.18
Nodes (11): Attack scenario, Attack scenario, Fix, Fix, Fix, Fix, H-02 — Cloud Functions expose the broker path with no subscription check and no rate limit, H-05 — Unauthenticated reCAPTCHA proxy burns billable assessment quota (+3 more)

### Community 85 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noUnusedLocals (+10 more)

### Community 86 - "InMemoryBrokerRepository"
Cohesion: 0.15
Nodes (4): docSnapshot(), InMemoryBrokerRepository, InMemorySubscriptionRepository, querySnapshot()

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
Cohesion: 0.14
Nodes (33): addBreakdownValue(), AdminDateRange, aggregateSummary(), analyticsTrade(), boundedRangeDocs(), cursorFingerprint(), decodeTradeCursor(), encodeTradeCursor() (+25 more)

### Community 95 - "useBrokerAccounts.js"
Cohesion: 0.32
Nodes (15): dropLocalAccount(), hasServerLogin(), useBrokerAccounts(), addAccount(), hasSessionCredential(), removeAccount(), syncAccount(), accountsKey() (+7 more)

### Community 96 - "marketData.js"
Cohesion: 0.17
Nodes (23): ABORTED, beginShared(), chartQuery(), directJson(), fetchSpotPrice(), fetchYahooChart(), health, inFlight (+15 more)

### Community 97 - "DashboardRightSidebar.jsx"
Cohesion: 0.09
Nodes (28): EditTradeModal(), ImageViewerModal(), CONFIDENCE_SCALE, CONFLUENCE, DashboardRightSidebar(), EMPTY_SETUPS, GRADES, legacySessionPrefill() (+20 more)

### Community 98 - "migrate-performance-data.mjs"
Cohesion: 0.22
Nodes (9): apply, args, main(), maxUsers, migrateBrokerJobs(), mode, startAfterBrokerPath, startAfterUser (+1 more)

### Community 101 - "C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out"
Cohesion: 0.50
Nodes (4): Attack scenarios, C-01 — Broker MT4/MT5 passwords stored in plaintext `localStorage`, never cleared at sign-out, CRITICAL, Fix

### Community 102 - "H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset"
Cohesion: 0.67
Nodes (3): Attack scenario, Fix, H-01 — Cron routes authenticate successfully against `"Bearer undefined"` when `CRON_SECRET` is unset

### Community 103 - "tradeAnalytics.js"
Cohesion: 0.08
Nodes (48): addSessionDelta(), persistBrokerTrades(), chunkedDbGetAll(), migrateAnalytics(), dateContradicts(), ENTRY_TIERS, entryInstant(), FirebaseTradeRepository (+40 more)

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
Nodes (11): AuthenticatedApp(), AuthenticatedAppContent(), PUBLIC_LEGAL_PATHS, AuthenticatedSessionProvider(), BrokerAccountsContext, useSessionWallet(), WalletContext, PageLoader() (+3 more)

### Community 110 - "createAppServices.js"
Cohesion: 0.16
Nodes (3): WalletRepository, ResetTradesUseCase, FirebaseWalletRepository

### Community 111 - "admin-dashboard/src/components/ui/dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 115 - "useMutationConfirmation.ts"
Cohesion: 0.43
Nodes (7): AdminMutationConfirmation, assertMutationReason(), mutationReasonError(), ConfirmationAction, MutationConfirmationState, PendingConfirmation, useMutationConfirmation()

### Community 117 - "useRouteExperience.js"
Cohesion: 0.40
Nodes (7): clearUxState(), shouldSkip(), useRouteExperience(), initGA(), trackPageview(), observeRouteWebVitals(), ratingFor()

### Community 118 - "DashboardLayout.jsx"
Cohesion: 0.06
Nodes (47): toast, WalletTopUpDialog(), DashboardLayout(), useToast(), Button(), buttonVariants, Input(), Sheet() (+39 more)

### Community 119 - "LogTradePage"
Cohesion: 0.33
Nodes (4): LogTradePage(), dayKeyAgo(), h, trade()

### Community 120 - "Admin Dashboard Adversarial Security Review — 2026-08-29"
Cohesion: 0.08
Nodes (24): Admin Dashboard Adversarial Security Review — 2026-08-29, Adversaries and failure modes, Critical, Executive summary, Findings, H-01 — MFA and role separation remain unenforced, H-02 — Remediated: hard user deletion was replaced with a recoverable request, High (+16 more)

### Community 121 - "ErrorBoundary.jsx"
Cohesion: 0.15
Nodes (8): cardStyle, detailStyle, ErrorBoundary, eyebrowStyle, iconStyle, primaryButtonStyle, secondaryButtonStyle, shellStyle

### Community 122 - "HistoryPage.setupWiring.test.jsx"
Cohesion: 0.33
Nodes (4): archiveSetup, createSetup, SETUPS, TRADE

### Community 123 - "api/index.ts"
Cohesion: 0.11
Nodes (19): buildAdminQuery(), reasonedBody(), requestCollection(), requestData(), decodeOverview(), AdminHealthRepository, AnalyticsRepository, AnnouncementRepository (+11 more)

### Community 124 - "DashboardLayout.sidebarWiring.test.js"
Cohesion: 0.83
Nodes (3): declaredProps(), passedProps(), withoutComments()

### Community 125 - "common.ts"
Cohesion: 0.05
Nodes (55): AccessDraft, UserAccessEditorProps, UserAnalyticsSectionProps, AdminApiAvailability, AdminHealth, AdminHealthCheck, AdminHealthCheckStatus, Analytics (+47 more)

### Community 126 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript, vite (+9 more)

### Community 128 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, preview, smoke:local, typecheck

### Community 129 - "AuthContext.tsx"
Cohesion: 0.12
Nodes (25): AuthenticatedLayout(), ADMIN_EMAIL, ADMIN_UID, AdminAdmissionError, AdminAdmissionFailure, admissionErrorMessage(), verifyAdminAdmission(), AdminLogin() (+17 more)

### Community 130 - "EmptyState.jsx"
Cohesion: 0.33
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 131 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, checkJs, lib, noEmit, paths, strict, types (+7 more)

### Community 132 - "db"
Cohesion: 0.20
Nodes (3): SubscriptionRepository, FirebaseSubscriptionRepository, db

### Community 134 - "BlogArticlePage.jsx"
Cohesion: 0.20
Nodes (13): getArticle(), BlogArticlePage(), escapeRegExp(), formatUpdated(), Headline(), NOTES, readRail(), sectionIds() (+5 more)

### Community 135 - "smoke-local.mjs"
Cohesion: 0.30
Nodes (10): checkApi(), checkUi(), fetchChecked(), LOOPBACK_HOSTS, main(), parseApiPath(), parseLocalUiUrl(), pass() (+2 more)

### Community 136 - "migrate-broker-credential-privacy.mjs"
Cohesion: 0.16
Nodes (19): ACCOUNT_CREDENTIAL_FIELDS, deletionPatch(), USER_CREDENTIAL_FIELDS, AccountLockResult, cachedJson(), inflight, sleep(), withAccountLock() (+11 more)

### Community 137 - "firebase.js"
Cohesion: 0.20
Nodes (13): PayPalStatus, storage, app, auth, facebookProvider, firebaseConfig, googleProvider, copyFor() (+5 more)

### Community 138 - "pages/index.ts"
Cohesion: 0.19
Nodes (14): AnalyticsPage, AnnouncementsPage, App(), CouponsPage, OverviewPage, PaymentsPage, ReportsPage, SettingsPage (+6 more)

### Community 141 - "build-og.mjs"
Cohesion: 0.40
Nodes (3): out, root, shot

### Community 142 - "dev-admin.mjs"
Cohesion: 0.25
Nodes (7): adminDirectory, adminViteEntry, apiEntry, missing, requiredFiles, rootDirectory, vercelEntry

### Community 143 - "useAppServices"
Cohesion: 0.15
Nodes (12): AppServicesContext, useAppServices(), APPLIED_PATCH, harness, LATER_TRADE, OLD_TRADE, RECENT_TRADE, USER (+4 more)

### Community 146 - "SetupCombobox.jsx"
Cohesion: 0.18
Nodes (11): effectiveSlug(), EMPTY_SETUPS, SetupCombobox(), CATALOG, DatePicker(), Popover(), PopoverContent(), PopoverDescription() (+3 more)

### Community 147 - "useAnnouncements.ts"
Cohesion: 0.19
Nodes (12): Announcement, AnnouncementCreate, AnnouncementLevel, AnnouncementListParams, AnnouncementStatus, AnnouncementTarget, AnnouncementUpdate, CreateAnnouncementInput (+4 more)

### Community 149 - "useSetups.js"
Cohesion: 0.19
Nodes (19): effectiveSlug(), findSlugOwner(), legacyTag(), ManageSetupsDialog(), trimmed(), compareSetups(), effectiveSlug(), findSlugOwner() (+11 more)

### Community 150 - "_paypalSubscriptions.ts"
Cohesion: 0.14
Nodes (36): approvalUrl(), billingCycles(), canonicalIdentity(), canonicalPayment(), cents(), checkoutAttemptRef(), checkoutOrigin(), completedSale() (+28 more)

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

### Community 175 - "admin-dashboard/src/components/ui/sheet.tsx"
Cohesion: 0.16
Nodes (9): Button(), buttonVariants, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+1 more)

### Community 176 - "LiveMarketWidget.test.jsx"
Cohesion: 0.24
Nodes (3): mountWidget(), selectTimeframe(), settle()

### Community 181 - "Login.jsx"
Cohesion: 0.24
Nodes (7): AppProviders(), Login, ThemeContext, ThemeProvider(), useAppTheme(), fetchCountry(), Login()

### Community 183 - "ToastContext.jsx"
Cohesion: 0.24
Nodes (7): actionIn(), BY_ID, CATALOG, rowFor(), TRADES, ToastContext, ToastProvider()

### Community 184 - "AnalyticsPage.jsx"
Cohesion: 0.10
Nodes (23): useChartTheme(), readTokens(), resolveChartTheme(), seriesColor(), TOKEN_NAMES, formatSignedNumber(), AnalyticsPage(), buildSessionInsight() (+15 more)

### Community 185 - "admin-dashboard/src/lib/utils.ts"
Cohesion: 0.20
Nodes (8): Badge(), badgeVariants, Input(), Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger()

## Knowledge Gaps
- **847 isolated node(s):** `USER_PLANS`, `USER_STATUSES`, `SUBSCRIPTION_STATUSES`, `PAYMENT_STATUSES`, `REPORT_TYPES` (+842 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `DashboardRightSidebar.jsx`, `PricingPage.jsx`, `EmptyState.jsx`, `FloatingDockNavigation.jsx`, `PublicSite.jsx`, `SectionCard.jsx`, `HistoryPage.jsx`, `sticky-footer.tsx`, `goldSessions.js`, `SetupCombobox.jsx`, `DataTable.jsx`, `DashboardLayout.jsx`, `tradeUtils.js`, `AnalyticsPage.jsx`, `src/lib/utils.ts`, `AppDialog.jsx`, `src/components/ui/dropdown-menu.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `createAdminApi()` connect `_admin.ts` to `api/[...route].ts`, `_adminAnalytics.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `TradeRepository` connect `TradeRepository` to `inMemoryRepositories.js`, `tradeAnalytics.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createAdminApi()` (e.g. with `publicAuthUser()` and `requestIdMiddleware()`) actually correct?**
  _`createAdminApi()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `USER_PLANS`, `USER_STATUSES`, `SUBSCRIPTION_STATUSES` to the rest of the system?**
  _847 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `disciplineRules.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08076923076923077 - nodes in this community are weakly interconnected._
- **Should `BrokerSync.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08478513356562137 - nodes in this community are weakly interconnected._