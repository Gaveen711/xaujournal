import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function useTrades(user) {
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrades = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const snapshot = await getDocs(collection(db, "users", user.uid, "trades"));
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => b.date.localeCompare(a.date));
      setTrades(loaded);
    } catch (error) {
      console.error('Error loading trades:', error);
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addTrade = async (tradeData) => {
    const docRef = await addDoc(collection(db, "users", user.uid, "trades"), tradeData);
    setTrades(prev => [{ id: docRef.id, ...tradeData }, ...prev]);
    return docRef;
  };

  const removeTrade = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'trades', id));
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const editTrade = async (id, updatedData) => {
    await updateDoc(doc(db, 'users', user.uid, 'trades', id), updatedData);
    setTrades(prev => prev.map(t => t.id === id ? updatedData : t));
  };

  return { trades, isLoading, addTrade, removeTrade, editTrade, refreshTrades: loadTrades };
}
