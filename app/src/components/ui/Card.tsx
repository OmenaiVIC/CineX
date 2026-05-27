interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'light' | 'darker';
  className?: string;
  padding?: 'none' | 'small' | 'default' | 'large';
}

export default function Card({ children, variant = 'default', className = '', padding = 'default', ...props }: CardProps) {
  const base = 'bg-gradient-radial-dark border border-gray-900/30 rounded-5xl overflow-hidden';
  const variants: Record<string, string> = { default: '', light: 'bg-gradient-radial-dark-light', darker: 'bg-gradient-radial-darker' };
  const paddings: Record<string, string> = { none: '', small: 'p-4', default: 'p-8', large: 'p-16' };
  return <div className={`${base} ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>{children}</div>;
}
