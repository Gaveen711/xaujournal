import { useState, useEffect } from 'react';
import { storage } from '../lib/tradeUtils';

export function useWallet() {
  const [startingBalance, setStartingBalance] = useState(0);

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const r = await storage.get('xau-starting-balance');
        setStartingBalance(r ? parseFloat(r) || 0 : 0);
      } catch { 
        setStartingBalance(0);
      }
    };
    loadWallet();
  }, []);

  const updateBalance = async (newBalance) => {
    setStartingBalance(newBalance);
    await storage.set('xau-starting-balance', newBalance);
  };

  return { startingBalance, updateBalance };
}
