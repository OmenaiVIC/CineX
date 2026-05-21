import React from 'react';

/**
 * Button component for consistent styling across the application
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {'primary'|'outline'|'ghost'|'neon'|'warm'} [props.variant='primary'] - Button style variant
 * @param {'small'|'default'|'large'} [props.size='default'] - Button size
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Button type
 */
function Button({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const baseClasses = 'inline-block font-medium rounded-full transition-all duration-200 focus:ring-4 focus:ring-opacity-40 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'px-8 py-4 tracking-tighter bg-[#4ade80] hover:bg-[#22c55e] active:bg-[#16a34a] text-black font-bold shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_35px_rgba(74,222,128,0.35)] focus:ring-[#4ade80]',
    neon: 'px-8 py-4 tracking-tighter bg-[#00e5ff] hover:bg-[#00c4e0] active:bg-[#00a3ba] text-black font-bold rounded-full shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_35px_rgba(0,229,255,0.35)] focus:ring-[#00e5ff]',
    outline: 'px-8 py-4 text-[#4ade80] hover:text-black tracking-tighter hover:bg-[#4ade80] border-2 border-[rgba(74,222,128,0.3)] hover:border-[#4ade80] focus:ring-[#4ade80]',
    ghost: 'px-4 py-2 text-white hover:text-[#4ade80] hover:bg-[rgba(74,222,128,0.1)] focus:ring-[#4ade80]',
    warm: 'px-8 py-4 tracking-tighter bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] text-black font-bold focus:ring-[#f59e0b]'
  };

  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    default: 'px-8 py-4',
    large: 'px-12 py-6 text-lg'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      className={classes}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;