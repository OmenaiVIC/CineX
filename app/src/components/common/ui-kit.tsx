import type { ReactNode } from 'react';
import Button from '../ui/Button';

// ---------------------------------------------------------------------------
// Shared UI kit — ported from cinex-canvas/src/components/cinex/ui-kit.tsx
// Adapted to the app SPA: no TanStack Link/router hooks, no lucide, no cn().
// Kept intentionally dependency-free so any page can consume these.
// ---------------------------------------------------------------------------

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Page header (eyebrow + title + subtitle)
// ---------------------------------------------------------------------------

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className = '',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  const alignCls = align === 'center' ? 'mx-auto text-center' : 'text-left';
  return (
    <header className={`max-w-3xl ${alignCls} ${className}`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4ade80]">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">{subtitle}</p>}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Panel — a bordered surface for content blocks
// ---------------------------------------------------------------------------

export function Panel({
  children,
  className = '',
  title,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-[#1a1a2e] bg-[#0a0a0f] p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// TierBadge — verification tier pill
// ---------------------------------------------------------------------------

export type VerificationTier = 'Unverified' | 'Basic' | 'Standard';

const tierStyles: Record<VerificationTier, string> = {
  Unverified: 'bg-gray-800 text-gray-400',
  Basic: 'bg-[#00e5ff]/15 text-[#00e5ff]',
  Standard: 'bg-[#4ade80]/15 text-[#4ade80]',
};

export function TierBadge({ tier }: { tier: VerificationTier | string }) {
  const key = (['Unverified', 'Basic', 'Standard'].includes(tier) ? tier : 'Unverified') as VerificationTier;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tierStyles[key]}`}>
      {key}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusPill — milestone / escrow status pill
// ---------------------------------------------------------------------------

export type MilestoneStatus = 'pending' | 'active' | 'completed' | 'failed' | 'Approved' | 'Released' | 'Disputed';

const statusStyles: Record<MilestoneStatus, string> = {
  pending: 'bg-gray-800 text-gray-400',
  active: 'bg-[#00e5ff]/15 text-[#00e5ff]',
  completed: 'bg-[#4ade80]/15 text-[#4ade80]',
  failed: 'bg-red-500/15 text-red-400',
  Approved: 'bg-[#4ade80]/15 text-[#4ade80]',
  Released: 'bg-[#00e5ff]/15 text-[#00e5ff]',
  Disputed: 'bg-red-500/15 text-red-400',
};

export function StatusPill({ status }: { status: MilestoneStatus | string }) {
  const key = status in statusStyles ? (status as MilestoneStatus) : 'pending';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[key]}`}>
      {key}
    </span>
  );
}

// ---------------------------------------------------------------------------
// EmptyState — icon + title + description + optional action
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1a1a2e] px-6 py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4ade80]/10 text-[#4ade80]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoadingSpinner / CardSkeleton
// ---------------------------------------------------------------------------

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} role="status" aria-label="Loading">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin text-[#4ade80]" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function CardSkeleton({ cards = 3, className = '' }: { cards?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-[#1a1a2e] bg-[#0a0a0f] p-4">
          <div className="h-28 w-full rounded-xl bg-gray-800" />
          <div className="mt-3 h-4 w-3/4 rounded bg-gray-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatUSD(amount: number): string {
  if (!isFinite(amount)) return '$0';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${Math.round(amount).toLocaleString()}`;
}

export function formatNGN(amount: number): string {
  if (!isFinite(amount)) return '₦0';
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}k`;
  return `₦${Math.round(amount).toLocaleString()}`;
}

export function formatDate(ts: number | string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default {
  cn,
  PageHeader,
  Panel,
  TierBadge,
  StatusPill,
  EmptyState,
  LoadingSpinner,
  CardSkeleton,
  formatUSD,
  formatNGN,
  formatDate,
};
