import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { slugifySetupName } from '../../lib/tradeAnalytics.js';
import { cn } from '../../lib/utils';

const EMPTY_SETUPS = Object.freeze([]);

/**
 * The slug a doc answers to — stored slug first, name only as a fallback.
 * Identical to the recipe in useSetups/matchSetupIdBySlug on purpose: a second
 * slugging rule anywhere is how a "Create" that should have been a "Restore"
 * gets through and strands legacy history on a duplicate slug.
 */
const effectiveSlug = (setup) => slugifySetupName(setup?.slug || setup?.name);

/**
 * SetupCombobox — the setup picker for both log surfaces (§4.2).
 *
 * Composed from Popover + Input + Button because there is no shadcn `command`
 * in this repo; the listbox semantics are supplied here rather than inherited,
 * so the input keeps focus and drives the list through `aria-activedescendant`
 * instead of roving tabindex.
 *
 * `setups` is the FULL catalog (archived and merged docs included, exactly what
 * `useSetups` returns). Filtering is this component's job: pickers show only
 * `!archived && !mergedInto`, while the archived rows are still needed to tell
 * a genuine "Create" apart from a "Restore" — creating over an archived slug
 * would mint a second doc on the same slug and silently re-bucket every legacy
 * trade that matched it.
 *
 * @param {object} props
 * @param {string|null} [props.value]                     Selected `setupId`, or null.
 * @param {(setupId: string|null) => void} [props.onValueChange]
 * @param {object[]} [props.setups]                       Full catalog.
 * @param {(name: string) => Promise<{id: string}>} [props.onCreateSetup]
 *        Omit to hide create-on-miss.
 * @param {(setupId: string) => Promise<void>} [props.onRestoreSetup]
 *        Omit to hide the Restore affordance (and with it the create row for an
 *        archived collision, which must never become a duplicate slug).
 * @param {(message: string) => void} [props.onError]     Create/restore failures.
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.id]                             Trigger id, for a FieldLabel.
 * @param {string} [props.placeholder='Setup']
 * @param {string} [props.className]                      Merged onto the trigger.
 */
export function SetupCombobox({
  value = null,
  onValueChange,
  setups = EMPTY_SETUPS,
  onCreateSetup,
  onRestoreSetup,
  onError,
  disabled = false,
  id,
  placeholder = 'Setup',
  className,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [pending, setPending] = useState(false);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();
  const optionId = (index) => `${listId}-option-${index}`;

  const catalog = Array.isArray(setups) ? setups : EMPTY_SETUPS;
  const active = useMemo(
    () => catalog.filter((setup) => !setup.archived && !setup.mergedInto),
    [catalog],
  );

  // Looked up across the WHOLE catalog: a trade tagged with a setup that was
  // archived after the fact still has to render its name rather than fall back
  // to the placeholder, which would read as "untagged".
  const selected = useMemo(
    () => (value ? catalog.find((setup) => setup.id === value) ?? null : null),
    [catalog, value],
  );

  const rows = useMemo(() => {
    const typed = query.trim();
    const needle = typed.toLowerCase();
    const matches = needle
      ? active.filter((setup) => String(setup.name ?? '').toLowerCase().includes(needle))
      : active;
    const list = matches.map((setup) => ({
      kind: 'setup', key: setup.id, id: setup.id, label: setup.name,
    }));

    // Create/Restore are offered on the SLUG, not on the display text: 'Asia
    // Sweep' and 'asia sweep' are the same setup, and offering to create the
    // second is offering to break the first.
    const slug = slugifySetupName(typed);
    if (slug && !active.some((setup) => effectiveSlug(setup) === slug)) {
      const archived = catalog.find((setup) => setup.archived && effectiveSlug(setup) === slug);
      if (archived) {
        if (onRestoreSetup) {
          list.push({ kind: 'restore', key: `restore:${archived.id}`, id: archived.id, label: archived.name });
        }
      } else if (onCreateSetup) {
        list.push({ kind: 'create', key: 'create', label: typed });
      }
    }

    list.push({ kind: 'none', key: 'none', label: 'None' });
    return list;
  }, [active, catalog, onCreateSetup, onRestoreSetup, query]);

  const activeIndex = rows.length ? Math.min(highlight, rows.length - 1) : 0;

  useEffect(() => { setHighlight(0); }, [open, query]);

  useEffect(() => {
    if (!open) return;
    // jsdom has no scrollIntoView; the optional call keeps the tests honest.
    optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const commit = useCallback(async (row) => {
    if (!row || pending) return;
    if (row.kind === 'setup') { onValueChange?.(row.id); close(); return; }
    if (row.kind === 'none') { onValueChange?.(null); close(); return; }

    setPending(true);
    try {
      if (row.kind === 'create') {
        const created = await onCreateSetup(row.label);
        onValueChange?.(created?.id ?? null);
      } else {
        await onRestoreSetup(row.id);
        onValueChange?.(row.id);
      }
      close();
    } catch (error) {
      // The catalog write is the thing that failed, so the selection is left
      // alone and the popup stays open on the text the user typed.
      onError?.(error?.message || 'Could not save that setup.');
    } finally {
      setPending(false);
    }
  }, [close, onCreateSetup, onError, onRestoreSetup, onValueChange, pending]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((current) => (Math.min(current, rows.length - 1) + 1) % rows.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((current) => (Math.min(current, rows.length - 1) + rows.length - 1) % rows.length);
    } else if (event.key === 'Enter') {
      // Both call sites sit inside a <form>; without this, Enter on the search
      // field submits the trade instead of picking the highlighted setup.
      event.preventDefault();
      commit(rows[activeIndex]);
    } else if (event.key === 'Escape') {
      // Handled here rather than left to the popover so the key never reaches
      // an enclosing dialog and closes that too.
      event.stopPropagation();
      close();
    }
  };

  const hasSetupRows = rows.some((row) => row.kind === 'setup');

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger
        data-slot="setup-combobox-trigger"
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50',
          className,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate text-left', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.name || placeholder}
        </span>
        <ChevronDown className="pointer-events-none size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        initialFocus={inputRef}
        className="w-(--anchor-width) min-w-48 gap-1.5 p-1.5"
      >
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search or create…"
          aria-label="Search setups"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={optionId(activeIndex)}
          className="h-7 text-sm"
        />

        <div id={listId} role="listbox" aria-label="Setups" className="flex max-h-56 flex-col overflow-y-auto">
          {!hasSetupRows && (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">
              {query.trim() ? 'No setup matches that name.' : 'No setups yet.'}
            </p>
          )}
          {rows.map((row, index) => {
            const isSelected = row.kind === 'setup' ? row.id === value : row.kind === 'none' && !value;
            return (
              <Button
                key={row.key}
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                variant="ghost"
                size="sm"
                disabled={pending}
                data-highlighted={index === activeIndex || undefined}
                className="w-full justify-start gap-1.5 px-1.5 font-normal data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                onMouseEnter={() => setHighlight(index)}
                onClick={() => commit(row)}
              >
                <Check
                  className={cn('size-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-left">
                  {row.kind === 'create' && `Create "${row.label}"`}
                  {row.kind === 'restore' && `Restore "${row.label}"`}
                  {(row.kind === 'setup' || row.kind === 'none') && row.label}
                </span>
                {(row.kind === 'create' || row.kind === 'restore') && (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {row.kind === 'create' ? 'new' : 'archived'}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
