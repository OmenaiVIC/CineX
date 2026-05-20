import type { JSX } from 'react';

interface BonusEligibilityBadgeProps {
  campaignId: string;
  isEligible: boolean;
  isLoading?: boolean;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; icon: string }
> = {
  eligible: {
    label: 'Bonus Eligible',
    bg: 'bg-green-900/40',
    text: 'text-green-400',
    icon: '★',
  },
  ineligible: {
    label: 'Not Bonus Eligible',
    bg: 'bg-gray-800',
    text: 'text-gray-400',
    icon: '☆',
  },
  loading: {
    label: 'Checking bonus...',
    bg: 'bg-gray-800/50',
    text: 'text-gray-500',
    icon: '◌',
  },
};

function getStatus(
  isEligible: boolean,
  isLoading: boolean,
): 'eligible' | 'ineligible' | 'loading' {
  if (isLoading) return 'loading';
  return isEligible ? 'eligible' : 'ineligible';
}

export default function BonusEligibilityBadge({
  campaignId,
  isEligible,
  isLoading = false,
  className = '',
}: BonusEligibilityBadgeProps) {
  const status = getStatus(isEligible, isLoading);
  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
      title={
        isLoading
          ? 'Checking milestone verification contract...'
          : isEligible
            ? 'Creator is eligible for the yield-escrow bonus'
            : 'Creator has not met bonus criteria'
      }
    >
      <span className="text-[10px]">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
