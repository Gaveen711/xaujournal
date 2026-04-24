import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, increment, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export function useTrades(user) {
  const [trades, setTrades]           = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [lastMT5Sync, setLastMT5Sync] = useState(null); // tracks last MT5 auto-sync time

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'users', user.uid, 'trades'),
      orderBy('date', 'desc')
    );

    // Real-time listener — fires instantly when MT5 syncs a new trade to Firestore
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Detect any newly added MT5 trades and update the last sync time
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.source === 'MT5_AUTO') {
              setLastMT5Sync(new Date());
            }
          }
        });

        setTrades(loaded);
        setIsLoading(false);
      },
      (error) => {
        console.error('Real-time trade listener error:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [user]);

  const addTrade = async (tradeData) => {
    const collRef = collection(db, 'users', user.uid, 'trades');
    const docRef  = await addDoc(collRef, tradeData);
    // Persist the ID inside the document to prevent orphaned record risk
    await updateDoc(docRef, { id: docRef.id });
    
    await updateDoc(doc(db, 'users', user.uid), {
      totalTradesLogged: increment(1)
    });
    return docRef;
  };

  const removeTrade = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'trades', id));
    await updateDoc(doc(db, 'users', user.uid), {
      totalTradesLogged: increment(-1)
    });
  };

  const editTrade = async (id, updatedData) => {
    // We explicitly keep the id if it exists in updatedData to maintain record identity
    await updateDoc(doc(db, 'users', user.uid, 'trades', id), updatedData);
  };

  const resetTrades = async () => {
    const { writeBatch, getDocs } = await import('firebase/firestore');
    const batch    = writeBatch(db);
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'trades'));
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await updateDoc(doc(db, 'users', user.uid), { totalTradesLogged: 0 });
  };

  return { trades, isLoading, addTrade, removeTrade, editTrade, resetTrades, lastMT5Sync };
}
