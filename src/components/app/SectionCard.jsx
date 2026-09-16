import { useId } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '../ui/card';
import { cn } from '../../lib/utils';

/**
 * SectionCard — the Console replacement for every `apple-glass-panel` /
 * `card-premium`. Default is a ruled section on L0 (top hairline + title
 * row), not a card; `surface` opts into a contained L1 panel.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title            REQUIRED. Sentence case.
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.actions]        Right-aligned header slot.
 * @param {React.ReactNode} [props.meta]           Small right-aligned figure (e.g. "15m", "21 rows").
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]         surface mode only -> CardFooter.
 * @param {boolean} [props.surface=false]          Opt-in L1 panel (Card). Default: ruled section on L0.
 * @param {boolean} [props.padded=true]            false = edge-to-edge children (tables, charts).
 * @param {boolean} [props.divided=true]           Hairline under the header (surface mode).
 * @param {React.ElementType} [props.as='section']
 * @param {string}  [props.className]
 * @param {string}  [props.contentClassName]
 */
export function SectionCard({
  title,
  description,
  actions,
  meta,
  children,
  footer,
  surface = false,
  padded = true,
  divided = true,
  as: As = 'section',
  className,
  contentClassName,
}) {
  const headingId = useId();
  const metaNode =
    meta != null ? (
      <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>
    ) : null;

  if (!surface) {
    return (
      <As aria-labelledby={headingId} className={cn('border-t border-border pt-3', className)}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3">
          <div className="min-w-0">
            <h2 id={headingId} className="text-sm font-medium text-foreground">
              {title}
            </h2>
            {description != null && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {(metaNode != null || actions != null) && (
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {metaNode}
              {actions}
            </div>
          )}
        </div>
        <div className={contentClassName}>{children}</div>
      </As>
    );
  }

  return (
    <As aria-labelledby={headingId} className={className}>
      <Card className="dashboard-section-card border border-border ring-0">
        <CardHeader className={cn('pt-3 gap-0.5', divided && 'border-b border-border pb-3')}>
          <CardTitle className="text-sm font-medium text-foreground">
            <h2 id={headingId}>{title}</h2>
          </CardTitle>
          {description != null && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
          {(metaNode != null || actions != null) && (
            <CardAction className="flex flex-wrap items-center gap-3">
              {metaNode}
              {actions}
            </CardAction>
          )}
        </CardHeader>
        <CardContent className={cn(!padded && 'px-0', contentClassName)}>{children}</CardContent>
        {footer != null && <CardFooter>{footer}</CardFooter>}
      </Card>
    </As>
  );
}
