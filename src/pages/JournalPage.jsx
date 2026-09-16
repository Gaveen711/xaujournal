import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { todayStr } from '../lib/tradeUtils';
import {
  PencilSquare,
  XLg,
  EmojiAngryFill,
  EmojiFrownFill,
  EmojiNeutralFill,
  EmojiSmileFill,
  EmojiSunglassesFill,
} from 'react-bootstrap-icons';
import { DatePicker } from '../components/ui/DatePicker';
import { SectionCard } from '../components/app/SectionCard';
import { EmptyState } from '../components/app/EmptyState';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';
import { cn } from '../lib/utils';

// Mood glyphs stay monochrome: color is reserved for P&L. The face carries
// the sentiment; selection state carries the emphasis.
const MOODS = [
  { value: '1', label: 'Terrible', Icon: EmojiAngryFill },
  { value: '2', label: 'Bad', Icon: EmojiFrownFill },
  { value: '3', label: 'Neutral', Icon: EmojiNeutralFill },
  { value: '4', label: 'Good', Icon: EmojiSmileFill },
  { value: '5', label: 'Excellent', Icon: EmojiSunglassesFill },
];

const entryDateLabel = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(date + 'T00:00:00')
  );

export function JournalPage() {
  const { journals, saveJournalEntry, deleteEntry } = useOutletContext();
  const toast = useToast();

  const [journalDate, setJournalDate] = useState(todayStr());
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [journalSaved, setJournalSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  // True once the user edits the open entry, until it is saved, deleted, or
  // they move to another date. Guards the re-seed above.
  const isDirtyRef = useRef(false);

  // Clears the transient "Saved" label. As a bare setTimeout in the save
  // handler this kept running after the page unmounted.
  useEffect(() => {
    if (!journalSaved) return undefined;
    const timer = setTimeout(() => setJournalSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [journalSaved]);

  const entries = useMemo(() => {
    return Object.entries(journals).sort((a, b) => b[0].localeCompare(a[0]));
  }, [journals]);

  // Seed the editor from the store, but never on top of unsaved edits.
  //
  // This effect used to depend on `journals` outright, so any snapshot landing
  // while the user typed — their own save, an edit from another tab, the
  // initial load resolving — reset the textarea to the stored text and threw
  // away everything written since. Keying it on the date alone fixes that but
  // breaks the first paint, where `journals` is still empty and the real entry
  // arrives a moment later.
  //
  // So: re-seed whenever the stored entry for this date changes, and skip only
  // when the user has actually touched the field. Switching dates always
  // re-seeds, because it clears the dirty flag first.
  const storedEntry = journals[journalDate];
  useEffect(() => {
    if (isDirtyRef.current) return;
    setJournalText(storedEntry?.text || '');
    setSelectedMood(storedEntry?.mood || null);
  }, [storedEntry]);

  useEffect(() => {
    isDirtyRef.current = false;
  }, [journalDate]);

  const onSaveJournal = async () => {
    if (!journalDate || saving) return;
    setSaving(true);
    try {
      await saveJournalEntry(journalDate, journalText, selectedMood);
      isDirtyRef.current = false;
      setJournalSaved(true);
      toast('Journal saved!', 'success');
    } catch {
      toast('Could not save your entry. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    const date = deleteTarget;
    setDeleteTarget(null);
    if (!date) return;
    try {
      await deleteEntry(date);
      if (journalDate === date) {
        isDirtyRef.current = false;
        setJournalText('');
        setSelectedMood(null);
      }
      toast('Entry deleted.', 'warn');
    } catch {
      // An failed delete is an error, not the same 'warn' the success path uses.
      toast('Could not delete that entry. Please try again.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-mono text-lg font-medium text-foreground">Journal</h1>
        <p className="text-sm text-muted-foreground">
          The half of the record your broker never asked for.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SectionCard surface title="Daily reflection" description="One honest note per session.">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="journal-date" className="text-xs font-medium text-muted-foreground">
                  Entry date
                </label>
                <DatePicker name="date" value={journalDate} onChange={setJournalDate} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span id="journal-mood-label" className="text-xs font-medium text-muted-foreground">
                  Session mood
                </span>
                <ToggleGroup
                  spacing={0}
                  aria-labelledby="journal-mood-label"
                  className="w-full"
                  value={selectedMood ? [String(selectedMood)] : []}
                  onValueChange={([next]) => {
                    if (!next) return;
                    isDirtyRef.current = true;
                    setSelectedMood(Number(next));
                  }}
                >
                  {MOODS.map(({ value, label, Icon }) => (
                    <ToggleGroupItem key={value} value={value} size="sm" className="flex-1" aria-label={label} title={label}>
                      <Icon aria-hidden="true" />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="journal-notes" className="text-xs font-medium text-muted-foreground">
                  Notes
                </label>
                <Textarea
                  id="journal-notes"
                  className="h-44 resize-none text-sm leading-relaxed"
                  value={journalText}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setJournalText(e.target.value);
                  }}
                  placeholder="What you saw, what you did, what you'd repeat…"
                />
              </div>

              <Button className="w-full" onClick={onSaveJournal} disabled={saving}>
                {saving ? 'Saving…' : journalSaved ? 'Saved' : 'Save entry'}
              </Button>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard title="Saved entries" meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}>
            {entries.length === 0 ? (
              <EmptyState
                title="Nothing kept yet"
                description="The first entry takes about forty seconds. It is the part of the record the analytics end up reading."
                action={
                  <Button size="sm" variant="outline" onClick={() => document.getElementById('journal-notes')?.focus()}>
                    <PencilSquare aria-hidden="true" data-icon="inline-start" />
                    Write today's note
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {entries.map(([date, entry]) => {
                  const mood = MOODS.find((m) => Number(m.value) === entry.mood);
                  const MoodIcon = mood?.Icon;
                  return (
                    <li key={date} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted',
                              mood ? 'text-foreground' : 'text-muted-foreground'
                            )}
                            title={mood?.label}
                            aria-hidden={mood ? undefined : 'true'}
                          >
                            {MoodIcon ? <MoodIcon aria-label={`Mood: ${mood.label}`} /> : '—'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{entryDateLabel(date)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(date + 'T00:00:00').toLocaleString('en-US', { weekday: 'long' })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(date)}
                          aria-label={`Delete entry for ${entryDateLabel(date)}`}
                        >
                          <XLg aria-hidden="true" />
                        </Button>
                      </div>
                      <p className="mt-3 break-words border-l-2 border-border pl-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {entry.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <AlertDialog open={deleteTarget != null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent overlayClassName="z-[70]" className="z-[80]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `The note for ${entryDateLabel(deleteTarget)} will be removed. This cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmDelete}>
              Delete entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
