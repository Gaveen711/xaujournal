import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import { Routes, Route } from "react-router-dom";
import Login from "./Login.jsx";

import { ToastProvider, useToast } from './components/ToastContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LogTradePage } from './pages/LogTradePage';
import { HistoryPage } from './pages/HistoryPage';
import { CalendarPage } from './pages/CalendarPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { JournalPage } from './pages/JournalPage';
import { useSubscription } from './hooks/useSubscription';
import { useAppTheme } from './hooks/useAppTheme';
import { CheckoutSuccess } from './pages/CheckoutSuccess';
import { CheckoutCancel } from './pages/CheckoutCancel';

import { PricingModal } from './components/PricingModal';
import { OnboardingModal } from './components/OnboardingModal';

// Inner wrapper that requires toast
function AuthenticatedApp({ user }) {
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { plan, expiry, startCheckout, isLoading: isSubLoading } = useSubscription(user);
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

  return (
    <>
      <Routes>
        <Route element={<DashboardLayout user={user} plan={plan} setShowPricingModal={setShowPricingModal} />}>
          <Route path="/" element={<LogTradePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/checkout-cancel" element={<CheckoutCancel />} />
        </Route>
      </Routes>

      {showPricingModal && <PricingModal plan={plan} expiry={expiry} onSubscribe={startCheckout} onClose={() => setShowPricingModal(false)} />}
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} onClose={dismissOnboarding} />}
    </>
  );
}

function App() {
  const { isLightMode } = useAppTheme(); // Apply theme side-effects immediately
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#e5e7eb' }}>
        Loading...
      </div>
    )
  }

  return (
    <ToastProvider>
      {user ? <AuthenticatedApp user={user} /> : <Login />}
    </ToastProvider>
  );
}

export default App;