import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { storage } from '../lib/tradeUtils';

export function useWallet(user) {
  const [startingBalance, setStartingBalance] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(1000); // Default $1000 goal
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
        
        let cloudStartingBalance = undefined;
        let cloudMonthlyGoal = undefined;

        if (userSnap.exists()) {
          const data = userSnap.data();
          cloudStartingBalance = data.startingBalance;
          cloudMonthlyGoal = data.monthlyGoal;
        }

        // 2. Migration & Initialization Check
        if (cloudStartingBalance === undefined) {
          const localBal = await storage.get('xau-starting-balance');
          const bal = localBal !== null ? (parseFloat(localBal) || 0) : 0;
          
          // Save to cloud immediately to fix the orphaned local state
          await updateDoc(userRef, { startingBalance: bal }, { merge: true });
          setStartingBalance(bal);
          
          if (localBal !== null) {
            await storage.remove('xau-starting-balance');
          }
        } else {
          setStartingBalance(cloudStartingBalance);
        }

        if (cloudMonthlyGoal !== undefined) {
          setMonthlyGoal(cloudMonthlyGoal);
        } else {
          // Initialize goal if missing
          await updateDoc(userRef, { monthlyGoal: 1000 }, { merge: true });
          setMonthlyGoal(1000);
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

  const updateMonthlyGoal = async (newGoal) => {
    setMonthlyGoal(newGoal);
    if (user) {
      await updateDoc(doc(db, "users", user.uid), {
        monthlyGoal: newGoal
      });
    }
  };

  return { startingBalance, updateBalance, monthlyGoal, updateMonthlyGoal, resetWallet, isLoading };
}
