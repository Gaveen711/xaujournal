import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout.jsx';

const LogTradePage = lazy(() => import('../../pages/LogTradePage.jsx').then((m) => ({ default: m.LogTradePage })));
const HistoryPage = lazy(() => import('../../pages/HistoryPage.jsx').then((m) => ({ default: m.HistoryPage })));
const CalendarPage = lazy(() => import('../../pages/CalendarPage.jsx').then((m) => ({ default: m.CalendarPage })));
const AnalyticsPage = lazy(() => import('../../pages/AnalyticsPage.jsx').then((m) => ({ default: m.AnalyticsPage })));
const JournalPage = lazy(() => import('../../pages/JournalPage.jsx').then((m) => ({ default: m.JournalPage })));
const SettingsPage = lazy(() => import('../../pages/SettingsPage.jsx').then((m) => ({ default: m.SettingsPage })));
const BrokerSync = lazy(() => import('../../components/BrokerSync.jsx'));
const PayPalStatus = lazy(() => import('../../pages/PayPalSubscriptionStatus.jsx'));

/** Authenticated feature routes share one dashboard layout and subscription context. */
export function AuthenticatedRoutes({ user, subscription, actions }) {
  return (
    <Routes>
      <Route element={(
        <DashboardLayout
          user={user}
          analytics={subscription.analytics}
          plan={subscription.plan}
          expiry={subscription.expiry}
          isTrial={subscription.isTrial}
          isTrialExpired={subscription.isTrialExpired}
          totalTrades={subscription.totalTrades}
          totalJournals={subscription.totalJournals}
          setShowPricingModal={actions.openPricing}
          openBrokerSyncUpsell={actions.openBrokerSyncUpsell}
          openPortal={subscription.openPortal}
        />
      )}>
        <Route index element={<LogTradePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="sync" element={<BrokerSync />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="billing/subscription-status" element={<PayPalStatus />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
    </Routes>
  );
}
