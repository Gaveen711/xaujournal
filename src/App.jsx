import { useState, useEffect, lazy, Suspense } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

import { useToast } from './components/ToastContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { useSubscription } from './hooks/useSubscription';
import { useWallet } from './hooks/useWallet';
import { useAppTheme } from './hooks/useAppTheme';

import { PricingModal } from './components/PricingModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ConsentModal } from './components/ConsentModal';

// Lazy load pages for performance (Handling named exports)
const LogTradePage = lazy(() => import('./pages/LogTradePage.jsx').then(m => ({ default: m.LogTradePage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx').then(m => ({ default: m.HistoryPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage.jsx').then(m => ({ default: m.CalendarPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.jsx').then(m => ({ default: m.AnalyticsPage })));
const JournalPage = lazy(() => import('./pages/JournalPage.jsx').then(m => ({ default: m.JournalPage })));
const MT5SyncSetup = lazy(() => import('./components/MT5SyncSetup').then(m => ({ default: m.default })));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess.jsx').then(m => ({ default: m.CheckoutSuccess })));
const CheckoutCancel = lazy(() => import('./pages/CheckoutCancel.jsx').then(m => ({ default: m.CheckoutCancel })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage.jsx').then(m => ({ default: m.TermsOfServicePage })));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage.jsx').then(m => ({ default: m.RefundPolicyPage })));
const PricingPage = lazy(() => import('./pages/PricingPage.jsx').then(m => ({ default: m.PricingPage })));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx').then(m => ({ default: m.ContactPage })));
const LandingPage = lazy(() => import('./pages/LandingPage.jsx').then(m => ({ default: m.LandingPage })));
const Login = lazy(() => import('./Login.jsx')); // Already a default export

const PageLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-6">
    <div className="relative">
      <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full" />
      <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl relative z-10 animate-bounce duration-1000">
        <img src="/favicon.png" alt="Loading" className="w-8 h-8 object-contain" />
      </div>
    </div>
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Syncing Terminal</p>
    </div>
  </div>
);

// Inner wrapper that requires toast
function AuthenticatedApp({ user }) {
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { plan, expiry, totalTrades, totalJournals, agreedToTerms, isLoading: isSubLoading, startCheckout, openPortal, agreeToTerms, recordProAcceptance } = useSubscription(user);
  const { updateBalance } = useWallet(user);
  const toast = useToast();

  useEffect(() => {
    if (!localStorage.getItem('xau-onboarded')) {
      setTimeout(() => setShowOnboarding(true), 400);
    }
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem('xau-onboarded', '1');
    setShowOnboarding(false);
  };

  const completeOnboarding = async (val) => {
    if (!isNaN(val) && val > 0) {
      const newBalance = parseFloat(val.toFixed(2));
      await updateBalance(newBalance);
    }
    localStorage.setItem('xau-onboarded', '1');
    setShowOnboarding(false);
    toast('Welcome! Log your first trade below.', 'success');
  };

  const location = useLocation();
  const isPublicPage = ['/privacy', '/pricing', '/contact', '/terms-and-conditions', '/refund-policy'].includes(location.pathname);

  return (
    <>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<DashboardLayout user={user} plan={plan} expiry={expiry} totalTrades={totalTrades} totalJournals={totalJournals} setShowPricingModal={setShowPricingModal} openPortal={openPortal} />}>
          <Route index element={<LogTradePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="sync" element={<MT5SyncSetup />} />
          <Route path="checkout-success" element={<CheckoutSuccess />} />
          <Route path="checkout-cancel" element={<CheckoutCancel />} />
        </Route>
      </Routes>
    </Suspense>

      {showPricingModal && <PricingModal plan={plan} expiry={expiry} onSubscribe={startCheckout} recordProAcceptance={recordProAcceptance} onClose={() => setShowPricingModal(false)} />}
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} onClose={dismissOnboarding} />}
      {!agreedToTerms && !isSubLoading && !isPublicPage && <ConsentModal onAgree={agreeToTerms} />}
    </>
  );
}

function App() {
  const { isLightMode } = useAppTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) setAuthError(true);
    }, 15000);

    const unsubscribe = onAuthStateChanged(auth,
      (currentUser) => {
        clearTimeout(timeout);
        setUser(currentUser);
        setLoading(false);
        setAuthError(false);
        if (currentUser) {
          localStorage.setItem('xau-auth-hint', 'true');
        } else {
          localStorage.removeItem('xau-auth-hint');
        }
      },
      (error) => {
        console.error("Auth Failure:", error);
        setAuthError(true);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Main UI render - Providers are now in main.jsx for stability
  return (
    <Suspense fallback={<PageLoader />}>
      {authError ? (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center border border-primary/20 relative">
              <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
              <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain grayscale opacity-50 relative z-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gradient uppercase tracking-tight">Sync Failure</h1>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed uppercase tracking-wider">
                The terminal failed to synchronize with the secure cloud. Please check your connection.
              </p>
            </div>
            <button onClick={() => window.location.reload()} className="w-full py-4 rounded-2xl bg-muted border border-border/50 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-muted/80 active:scale-95 transition-all text-foreground/70">
              Reconnect Terminal
            </button>
          </div>
        </div>
      ) : loading ? (
        localStorage.getItem('xau-auth-hint') === 'true' ? (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Restoring Secure Session</p>
          </div>
        ) : (
          <PageLoader />
        )
      ) : (
        <Routes>
          <Route path="/" element={user ? <Navigate to="/app" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-and-conditions" element={<TermsOfServicePage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/app/*" element={user ? <AuthenticatedApp user={user} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </Suspense>
  );
}

export default App;