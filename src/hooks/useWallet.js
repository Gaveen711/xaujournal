import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { storage } from '../lib/tradeUtils';

export function useWallet(user) {
  const [startingBalance, setStartingBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadWallet = async () => {
      try {
        setIsLoading(true);
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        // 1. Check Cloud Balance
        if (userSnap.exists() && userSnap.data().startingBalance !== undefined) {
          setStartingBalance(userSnap.data().startingBalance);
        } else {
          // 2. Migration Check
          const localBal = await storage.get('xau-starting-balance');
          if (localBal !== null) {
            const bal = parseFloat(localBal) || 0;
            // Save to cloud
            await updateDoc(userRef, { startingBalance: bal });
            setStartingBalance(bal);
            // Cleanup local
            await storage.remove('xau-starting-balance');
          } else {
            setStartingBalance(0);
          }
        }
      } catch (error) {
        console.error('Wallet Sync Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWallet();
  }, [user]);

  const updateBalance = async (newBalance) => {
    setStartingBalance(newBalance);
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        startingBalance: newBalance
      });
    }
  };

  const resetWallet = async () => {
    setStartingBalance(0);
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        startingBalance: 0
      });
    }
  };

  return { startingBalance, updateBalance, resetWallet, isLoading };
}
