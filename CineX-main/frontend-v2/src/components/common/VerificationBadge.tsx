import type { UserProfile } from '../../types';

interface VerificationBadgeProps {
  level: UserProfile['verificationLevel'];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const config: Record<UserProfile['verificationLevel'], { label: string; tooltip: string; colors: string; icon: string }> = {
  'unverified': {
    label: 'Unverified',
    tooltip: 'This filmmaker has not completed identity verification yet.',
    colors: 'bg-gray-700 text-gray-300',
    icon: '○',
  },
  '1-tier': {
    label: 'Tier 1',
    tooltip: 'Identity verified. This filmmaker has confirmed their real-world identity.',
    colors: 'bg-blue-900/50 text-blue-300 border border-blue-700',
    icon: '✓',
  },
  '2-tier': {
    label: 'Tier 2',
    tooltip: 'Portfolio verified. Identity confirmed with a track record of completed work.',
    colors: 'bg-purple-900/50 text-purple-300 border border-purple-700',
    icon: '✓✓',
  },
  '3-tier': {
    label: 'Tier 3',
    tooltip: 'Fully endorsed. Identity, portfolio, and community reputation all verified.',
    colors: 'bg-amber-900/50 text-amber-300 border border-amber-600',
    icon: '★',
  },
};

const sizeMap = {
  sm: { badge: 'px-1.5 py-0.5 text-2xs', icon: 'text-xs' },
  md: { badge: 'px-2.5 py-0.5 text-xs', icon: 'text-sm' },
  lg: { badge: 'px-3 py-1 text-sm', icon: 'text-base' },
};

export default function VerificationBadge({ level, size = 'md', showLabel = true }: VerificationBadgeProps) {
  const c = config[level];
  const s = sizeMap[size];

  return (
    <div className="relative group inline-flex">
      <span className={`inline-flex items-center gap-1 rounded-full font-medium ${c.colors} ${s.badge}`}>
        <span className={s.icon}>{c.icon}</span>
        {showLabel && c.label}
      </span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64">
        <p className="text-xs text-gray-300">{c.tooltip}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
      </div>
    </div>
  );
}
