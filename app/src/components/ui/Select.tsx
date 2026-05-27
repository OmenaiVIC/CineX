interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options?: (string | SelectOption)[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Select({ options = [], value, onChange, name, placeholder = 'Select an option', required = false, disabled = false, className = '', ...props }: SelectProps) {
  return (
    <select value={value} onChange={onChange} name={name} required={required} disabled={disabled}
      className={`w-full px-4 py-3 text-white bg-transparent border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`} {...props}>
      <option value="" disabled>{placeholder}</option>
      {options.map((opt, i) => {
        const item = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        return <option key={i} value={item.value} className="bg-gray-900 text-white">{item.label}</option>;
      })}
    </select>
  );
}
