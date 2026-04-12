import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { todayStr } from '../lib/tradeUtils';

export function JournalPage() {
  const { journals, saveJournalEntry, deleteEntry, plan, setShowPricingModal } = useOutletContext();
  const toast = useToast();
  
  const [journalDate, setJournalDate] = useState(todayStr());
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [journalSaved, setJournalSaved] = useState(false);

  const moods = ['', '😤', '😕', '😐', '🙂', '😎'];
  const moodLabels = ['Terrible', 'Bad', 'Neutral', 'Good', 'Excellent'];
  const entries = Object.entries(journals).sort((a, b) => b[0].localeCompare(a[0]));
  const SUB_LIMITS = { freeJournals: 10 };

  useEffect(() => {
    const entry = journals[journalDate] || {};
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJournalText(entry.text || '');
    setSelectedMood(entry.mood || null);
  }, [journalDate, journals]);

  const onSaveJournal = async () => {
    if (!journalDate) return;
    const entryExists = Boolean(journals[journalDate]);
    
    if (plan === 'free' && !entryExists && Object.keys(journals).length >= SUB_LIMITS.freeJournals) {
      setShowPricingModal(true);
      toast(`Free plan limit (${SUB_LIMITS.freeJournals} entries). Upgrade to Pro.`, 'warn');
      return;
    }
    
    try {
      await saveJournalEntry(journalDate, journalText, selectedMood);
      setJournalSaved(true);
      setTimeout(() => setJournalSaved(false), 2000);
      toast('Journal saved!', 'success');
    } catch {
      toast('Storage error.', 'error');
    }
  };

  const onDeleteEntry = async (date) => {
    if (confirm('Delete this journal entry?')) {
      try {
        await deleteEntry(date);
        if (journalDate === date) {
          setJournalText(''); 
          setSelectedMood(null);
        }
        toast('Entry deleted.', 'warn');
      } catch {
        toast('Storage error.', 'warn');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-black text-gradient">Mindset Journal</h1>
        <p className="text-muted-foreground text-sm">Document your psychology to master your emotions.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="card-premium p-8 space-y-6">
            <h3 className="text-lg font-bold">Today's Reflection</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Entry Date</label>
                <input type="date" value={journalDate} onChange={e => setJournalDate(e.target.value)} className="input-premium" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Market Mood</label>
                <div className="flex justify-between bg-muted rounded-2xl p-2 gap-1">
                  {moods.slice(1).map((emoji, index) => (
                    <button 
                      key={index} 
                      title={moodLabels[index]}
                      onClick={() => setSelectedMood(index + 1)}
                      className={`flex-1 aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${selectedMood === index + 1 ? 'bg-background shadow-lg scale-110' : 'hover:bg-background/50 opacity-50 hover:opacity-100'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your Thoughts</label>
                <textarea 
                  className="input-premium h-48 resize-none text-sm leading-relaxed" 
                  value={journalText} 
                  onChange={e => setJournalText(e.target.value)}
                  placeholder="How did you feel during today's trades? Any FOMO? Any revenge trading? Focus on your emotions..." 
                />
              </div>

              <button 
                className="btn-primary w-full h-12 text-base font-bold flex items-center justify-center gap-2" 
                onClick={onSaveJournal}
              >
                {journalSaved ? '✓ Entry Saved' : 'Save Reflection'}
              </button>

              {plan === 'free' && (
                <div className="space-y-1.5 pt-2 border-t border-border/30">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Journal Capacity</span>
                    <span>{Object.keys(journals).length} / {SUB_LIMITS.freeJournals} Entries</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/30 shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ${Object.keys(journals).length >= SUB_LIMITS.freeJournals ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-primary'}`} 
                      style={{ width: `${(Object.keys(journals).length / SUB_LIMITS.freeJournals) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            Past Entries 
            <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-bold text-muted-foreground">{entries.length}</span>
          </h3>
          
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="card-premium p-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
                <div className="text-4xl">✍️</div>
                <div className="text-sm font-medium">Your journal is empty. Start writing above.</div>
              </div>
            ) : (
              entries.map(([date, entry]) => (
                <div key={date} className="card-premium p-6 group hover:border-primary/20 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-tight">
                          {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T00:00:00'))}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">{new Date(date + 'T00:00:00').toLocaleString('en-US', { weekday: 'long' })}</span>
                      </div>
                      {entry.mood ? (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg shadow-inner">
                          {moods[entry.mood]}
                        </div>
                      ) : null}
                    </div>
                    <button 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100" 
                      onClick={() => onDeleteEntry(date)}
                    >×</button>
                  </div>
                  <div className="text-sm text-foreground/70 leading-relaxed line-clamp-3 whitespace-pre-wrap italic border-l-2 border-primary/20 pl-4 py-1">
                    "{entry.text}"
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

