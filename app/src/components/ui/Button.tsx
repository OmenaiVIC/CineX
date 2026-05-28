interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'neon' | 'warm';
  size?: 'small' | 'default' | 'large';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export default function Button({ children, variant = 'primary', size = 'default', className = '', disabled = false, type = 'submit', ...props }: ButtonProps) {
  const base = 'inline-block font-medium rounded-full transition-all duration-200 focus:ring-4 focus:ring-opacity-40 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'px-8 py-4 tracking-tighter bg-[#4ade80] hover:bg-[#22c55e] active:bg-[#16a34a] text-black font-bold shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_35px_rgba(74,222,128,0.35)]',
    neon: 'px-8 py-4 tracking-tighter bg-[#00e5ff] hover:bg-[#00c4e0] active:bg-[#00a3ba] text-black font-bold',
    outline: 'px-8 py-4 text-[#4ade80] hover:text-black tracking-tighter hover:bg-[#4ade80] border-2 border-[rgba(74,222,128,0.3)] hover:border-[#4ade80]',
    ghost: 'px-4 py-2 text-white hover:text-[#4ade80] hover:bg-[rgba(74,222,128,0.1)]',
    warm: 'px-8 py-4 tracking-tighter bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold',
  };
  const sizes: Record<string, string> = { small: 'px-4 py-2 text-sm', default: 'px-8 py-4', large: 'px-12 py-6 text-lg' };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} type={type} {...props}>{children}</button>;
}
