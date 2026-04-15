import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebase';
import { useToast } from '../components/ToastContext';

export function useSubscription(user) {
  const [subscription, setSubscription] = useState({ 
    plan: 'free', 
    expiry: null, 
    isLoading: true, 
    agreedToTerms: false 
  });
  const toast = useToast();

  useEffect(() => {
    if (!user) {
      setSubscription({ plan: 'free', expiry: null, isLoading: false });
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isPro = data.plan === 'pro';
        const expiryDate = data.planExpiry ? new Date(data.planExpiry) : null;
        const now = new Date();
        const GRACE_PERIOD_MS = 4 * 24 * 60 * 60 * 1000;

        if (isPro && expiryDate) {
          const cutoffDate = new Date(expiryDate.getTime() + GRACE_PERIOD_MS);
          
          if (now > cutoffDate) {
            if (data.plan !== 'free') {
              updateDoc(doc(db, "users", user.uid), { plan: 'free' });
            }
            setSubscription({ 
              plan: 'free', 
              expiry: data.planExpiry, 
              totalTrades: data.totalTradesLogged || 0,
              totalJournals: data.totalJournalsLogged || 0,
              isLoading: false 
            });
          } else {
            setSubscription({ 
              plan: 'pro', 
              expiry: data.planExpiry, 
              totalTrades: data.totalTradesLogged || 0,
              totalJournals: data.totalJournalsLogged || 0,
              isLoading: false,
              isGracePeriod: now > expiryDate 
            });
          }
        } else {
          setSubscription({ 
            plan: data.plan || 'free', 
            expiry: data.planExpiry || null, 
            totalTrades: data.totalTradesLogged || 0,
            totalJournals: data.totalJournalsLogged || 0,
            agreedToTerms: data.agreedToTerms || false,
            isLoading: false 
          });
        }
      } else {
        // Create profile if missing
        setDoc(doc(db, "users", user.uid), { plan: 'free', totalTradesLogged: 0, totalJournalsLogged: 0, agreedToTerms: false }, { merge: true });
        setSubscription({ plan: 'free', expiry: null, totalTrades: 0, totalJournals: 0, agreedToTerms: false, isLoading: false });
      }
    });

    return () => unsub();
  }, [user, toast]);

  const startCheckout = async () => {
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          origin: window.location.origin,
          email: user.email,
          userId: user.uid
        })
      });
      
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create session');
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      toast("Could not initiate checkout. Check your Vercel logs.", "error");
    }
  };

  const openPortal = async () => {
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/portal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: user.uid,
          origin: window.location.origin
        })
      });
      
      const contentType = resp.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await resp.text();
        console.error("API Error (Not JSON):", text);
        throw new Error(resp.status === 404 ? "Portal API not found. If testing locally, use 'vercel dev'." : "Server returned an invalid response.");
      }

      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error) {
      console.error("Portal Error:", error);
      toast(error.message || "Could not open management portal.", "error");
    }
  };

  const agreeToTerms = async () => {
    try {
      await updateDoc(doc(db, "users", user.uid), { 
        agreedToTerms: true,
        agreedAt: new Date().toISOString() 
      });
    } catch (error) {
      console.error("Agreement Error:", error);
      toast("Failed to save agreement. Check connection.", "error");
    }
  };
  
  return { ...subscription, startCheckout, openPortal, agreeToTerms };
}