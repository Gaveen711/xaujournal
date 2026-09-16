import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function FloatingDockNavigation({ items, visible = true, ariaLabel = 'Dashboard' }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const getScale = (index) => {
    if (hoveredIndex === null) return 1;

    const distance = Math.abs(hoveredIndex - index);
    if (distance === 0) return 1.4;
    if (distance === 1) return 1.2;
    if (distance === 2) return 1.1;
    return 1;
  };

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-safe pt-5 transition-transform duration-200 md:hidden',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
      aria-label={ariaLabel}
    >
      <div
        className="dashboard-floating-dock safe-bottom mb-4 flex items-end gap-0.5 rounded-2xl border border-border/80 bg-card/85 p-1.5 shadow-2xl backdrop-blur-xl min-[380px]:gap-1 min-[380px]:p-2"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.to}
              aria-label={item.name}
              aria-current={item.active ? 'page' : undefined}
              onMouseEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
              className={cn(
                'dashboard-floating-dock-item relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-[transform,background-color,color] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card min-[380px]:size-12',
                item.active
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
              style={{
                '--dock-scale': getScale(index),
                transformOrigin: 'bottom',
              }}
            >
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />

              {hoveredIndex === index && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] font-medium text-popover-foreground shadow-xl"
                >
                  {item.name}
                  <span
                    className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-popover"
                    aria-hidden="true"
                  />
                </span>
              )}

              {item.active && (
                <span
                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  aria-hidden="true"
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
