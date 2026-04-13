import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { todayStr } from '../lib/tradeUtils';
import { PencilSquare, XLg } from 'react-bootstrap-icons';
import { DatePicker } from '../components/ui/DatePicker';

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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-gradient uppercase tracking-tight">Psychology Log</h1>
        <p className="text-muted-foreground text-sm font-medium">Document your intelligence and master the emotional market curve.</p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6 animate-in slide-in-from-left-4 duration-700">
          <div className="card-premium p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Daily Reflection
            </h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Entry Date</label>
                <DatePicker name="date" value={journalDate} onChange={setJournalDate} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Market Mood</label>
                <div className="flex justify-between bg-muted/40 rounded-[1.25rem] p-1.5 gap-1 border border-border/40">
                  {moods.slice(1).map((emoji, index) => (
                    <button 
                      key={index} 
                      title={moodLabels[index]}
                      onClick={() => setSelectedMood(index + 1)}
                      className={`flex-1 aspect-square rounded-xl text-xl flex items-center justify-center transition-all duration-300 active:scale-75 ${selectedMood === index + 1 ? 'bg-background shadow-lg scale-110 ring-1 ring-border/50' : 'hover:bg-background/30 opacity-40 hover:opacity-100'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/90 ml-1">Cognitive Brief</label>
                <textarea 
                  className="input-premium h-48 resize-none text-sm leading-relaxed p-4" 
                  value={journalText} 
                  onChange={e => setJournalText(e.target.value)}
                  placeholder="Intercept your emotional signals. Identify FOMO, revenge trading, or discipline..." 
                />
              </div>

              <button 
                className={`btn-primary w-full h-12 text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${journalSaved ? 'bg-green-600 border-green-500' : ''}`}
                onClick={onSaveJournal}
              >
                {journalSaved ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin hidden" />
                    ✓ Intelligence Saved
                  </>
                ) : 'Authorize Log'}
              </button>

              {plan === 'free' && (
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-foreground/85 ml-1">
                    <span>Journal Capacity</span>
                    <span>{Object.keys(journals).length} / {SUB_LIMITS.freeJournals} Entries</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/30 shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ease-[var(--apple-ease)] ${Object.keys(journals).length >= SUB_LIMITS.freeJournals ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-primary'}`} 
                      style={{ width: `${(Object.keys(journals).length / SUB_LIMITS.freeJournals) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-right-4 duration-700 delay-200">
          <h3 className="text-lg font-bold flex items-center gap-3">
            Stored Intelligence 
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-black text-primary tracking-tight">{entries.length} Entries</span>
          </h3>
          
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="card-premium p-20 flex flex-col items-center justify-center text-muted-foreground gap-6">
                <div className="w-20 h-20 rounded-[2.5rem] bg-muted/50 border border-border/50 flex items-center justify-center shadow-inner rotate-3 hover:rotate-0 transition-transform duration-500">
                  <PencilSquare className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div className="text-center space-y-1">
                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">Encryption Empty</span>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/75 leading-relaxed px-8">Initialize cognitive reflections to begin documentation.</p>
                </div>
              </div>
            ) : (
              entries.map(([date, entry], idx) => (
                <div 
                  key={date} 
                  className="card-premium p-6 group hover:bg-muted/30 transition-all duration-500 ease-[var(--spring-bounce)] animate-in slide-in-from-bottom-2 fill-both"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {entry.mood ? (
                        <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                          {moods[entry.mood]}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center text-lg text-muted-foreground">?</div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tight text-foreground/95">
                          {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T00:00:00'))}
                        </span>
                        <span className="text-[10px] font-black text-foreground/75 uppercase tracking-[0.1em]">{new Date(date + 'T00:00:00').toLocaleString('en-US', { weekday: 'long' })}</span>
                      </div>
                    </div>
                    <button 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-75 sm:opacity-0 group-hover:opacity-100" 
                      onClick={() => onDeleteEntry(date)}
                    >
                      <XLg className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm font-medium text-foreground/95 leading-relaxed line-clamp-4 whitespace-pre-wrap italic border-l-2 border-primary/20 pl-5 py-1 group-hover:border-primary transition-colors">
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


