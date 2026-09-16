import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar3 } from 'react-bootstrap-icons';
import { pad2 } from '../../lib/tradeUtils';
import { cn } from '../../lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from './popover';

/**
 * `className` lands on the trigger so a form can bring the control to its own
 * field height. It merges after the defaults, so an `h-*` passed here wins.
 */
export function DatePicker({ value, onChange, name, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value + 'T00:00:00') : new Date());


  // Parse value to date components
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const calMonth = viewDate.getMonth();
  const calYear = viewDate.getFullYear();

  const formatDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

  const changeMonth = (delta) => {
    let nextMonth = calMonth + delta, nextYear = calYear;
    if (nextMonth < 0) { nextMonth = 11; nextYear--; }
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }
    setViewDate(new Date(nextYear, nextMonth, 1));
  };

  const handleDayClick = (d) => {
    const formatted = formatDate(calYear, calMonth, d);
    onChange(formatted);
    setIsOpen(false);
  };

  const setToday = () => {
    const today = new Date();
    const formatted = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
    onChange(formatted);
    setViewDate(today);
    setIsOpen(false);
  };



  const renderCells = () => {
    const first = new Date(calYear, calMonth, 1).getDay();
    const days = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < first; i++) cells.push(<div key={`empty-${i}`} className="h-9 min-w-0"></div>);

    for (let d = 1; d <= days; d++) {
      const isSelected = selectedDate && d === selectedDate.getDate() && calMonth === selectedDate.getMonth() && calYear === selectedDate.getFullYear();
      const today = new Date();
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

      cells.push(
        <button
          key={`day-${d}`}
          type="button"
          aria-label={formatDate(calYear, calMonth, d)}
          aria-pressed={Boolean(isSelected)}
          aria-current={isToday ? 'date' : undefined}
          onClick={() => handleDayClick(d)}
          className={`min-w-0 h-9 rounded-lg text-[11px] font-black transition-all flex items-center justify-center border-0 ${
            isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' :
            isToday ? 'text-primary bg-primary/10' : 'text-foreground/70 hover:bg-muted'
          }`}
        >
          {d}
        </button>
      );
    }
    return cells;
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      if (open) setViewDate(value ? new Date(value + 'T00:00:00') : new Date());
      setIsOpen(open);
    }}>
      <PopoverTrigger
        aria-label={value ? `Choose date, ${value}` : 'Choose date'}
        className={cn('input-premium w-full h-12 flex items-center justify-between cursor-pointer group', className)}
      >
        <span className="text-sm font-bold">{value || 'Select Date...'}</span>
        <Calendar3 className={`w-4 h-4 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
      </PopoverTrigger>
      <input type="hidden" name={name} value={value} />

      <PopoverContent align="start" aria-label="Choose date" className="w-72 max-w-[calc(100vw-2rem)] gap-0 p-3">
          <div className="flex justify-between items-center mb-4">
            <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-muted rounded-full transition-all active:scale-90">
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
              {new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
            </span>
            <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} className="p-1.5 hover:bg-muted rounded-full transition-all active:scale-90">
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="min-w-0 h-4 flex items-center justify-center text-[8px] font-black text-muted-foreground">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderCells()}
          </div>

          <div className="mt-4 pt-4 border-t border-border/30">
            <button
              type="button"
              onClick={setToday}
              className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg transition-all"
            >
              Today
            </button>
          </div>
      </PopoverContent>
    </Popover>
  );
}

