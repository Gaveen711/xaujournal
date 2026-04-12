import { useState, useEffect } from 'react';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function useJournals(user) {
  const [journals, setJournals] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const loadJournals = async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    try {
      setIsLoading(true);
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'journals'));
      const newJournals = {};
      snapshot.docs.forEach(d => { newJournals[d.id] = d.data(); });
      setJournals(newJournals);
    } catch { 
      setJournals({}); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveJournalEntry = async (date, text, mood) => {
    const newJournals = { ...journals };
    if (text.trim()) {
      newJournals[date] = { text, mood };
      await setDoc(doc(db, 'users', user.uid, 'journals', date), { text, mood });
    } else {
      delete newJournals[date];
      await deleteDoc(doc(db, 'users', user.uid, 'journals', date));
    }
    setJournals(newJournals);
    return newJournals;
  };

  const deleteEntry = async (date) => {
    const newJournals = { ...journals };
    delete newJournals[date];
    await deleteDoc(doc(db, 'users', user.uid, 'journals', date));
    setJournals(newJournals);
  };

  return { journals, isLoading, saveJournalEntry, deleteEntry, refreshJournals: loadJournals };
}
