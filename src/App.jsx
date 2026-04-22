import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./Login.jsx";

import { ToastProvider, useToast } from './components/ToastContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LogTradePage } from './pages/LogTradePage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { JournalPage } from './pages/JournalPage.jsx';
import MT5SyncSetup from './components/MT5SyncSetup';
import { useSubscription } from './hooks/useSubscription';
import { useAppTheme } from './hooks/useAppTheme';
import { CheckoutSuccess } from './pages/CheckoutSuccess.jsx';
import { CheckoutCancel } from './pages/CheckoutCancel.jsx';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.jsx';
import { PricingPage } from './pages/PricingPage.jsx';
import { ContactPage } from './pages/ContactPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';

import { PricingModal } from './components/PricingModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ConsentModal } from './components/ConsentModal';
import { ErrorBoundary } from './components/ErrorBoundary';

// Inner wrapper that requires toast
function AuthenticatedApp({ user }) {
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { plan, expiry, totalTrades, totalJournals, agreedToTerms, isLoading: isSubLoading, startCheckout, openPortal, agreeToTerms } = useSubscription(user);
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
      localStorage.setItem('xau-starting-balance', JSON.stringify(newBalance));
    }
    localStorage.setItem('xau-onboarded', '1');
    setShowOnboarding(false);
    toast('Welcome! Log your first trade below.', 'success');
  };

  const location = useLocation();
  const isPublicPage = ['/privacy', '/pricing', '/contact'].includes(location.pathname);

  return (
    <>
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

      {showPricingModal && <PricingModal plan={plan} expiry={expiry} onSubscribe={startCheckout} onClose={() => setShowPricingModal(false)} />}
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} onClose={dismissOnboarding} />}
      {!agreedToTerms && !isSubLoading && !isPublicPage && <ConsentModal onAgree={agreeToTerms} />}
    </>
  );
}

function App() {
  const { isLightMode } = useAppTheme(); // Apply theme side-effects immediately
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    // Watchdog timer (15 seconds)
    const timeout = setTimeout(() => {
      if (loading) setAuthError(true);
    }, 15000);

    const unsubscribe = onAuthStateChanged(auth,
      (currentUser) => {
        clearTimeout(timeout);
        setUser(currentUser);
        setLoading(false);
        setAuthError(false);
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
  }, [loading]);

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center border border-primary/20 relative">
            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
            <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain grayscale opacity-50 relative z-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gradient uppercase tracking-tight">Sync Failure</h1>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed uppercase tracking-wider">
              The terminal failed to synchronize with the secure cloud. This is usually caused by a strict network firewall or a weak connection.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 rounded-2xl bg-muted border border-border/50 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-muted/80 active:scale-95 transition-all text-foreground/70"
          >
            Reconnect Terminal
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full" />
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl relative z-10 animate-bounce duration-1000">
            <img src="/favicon.png" alt="Loading" className="w-8 h-8 object-contain" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Syncing Terminal</p>
          <div className="w-32 h-[1px] bg-border/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary animate-[shimmer_2s_infinite]" style={{ width: '40%' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Routes>
          {/* Public Website Flow */}
          <Route path="/" element={user ? <Navigate to="/app" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />

          {/* Protected App Flow */}
          <Route path="/app/*" element={user ? <AuthenticatedApp user={user} /> : <Navigate to="/login" />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;