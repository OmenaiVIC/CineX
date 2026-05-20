import { useState } from 'react';

interface CommentHashInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export default function CommentHashInput({ value, onChange, placeholder = 'Enter IPFS hash or Stacks tx ID', label = 'Comment Hash' }: CommentHashInputProps) {
  const [isHex, setIsHex] = useState(false);

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          <span className="ml-2 text-xs text-gray-500">(optional — on-chain proof)</span>
        </label>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsHex(/^[0-9a-fA-F]+$/.test(e.target.value.trim()));
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {value && (
          <span className="flex items-center text-xs text-gray-500">
            {isHex ? '0x' : 'ipfs'}
          </span>
        )}
      </div>
      {value && !isHex && value.length > 0 && (
        <p className="text-xs text-gray-500">
          Non-hex value — stored as plaintext reference. Use a content hash (SHA-256, IPFS CID) for on-chain verification.
        </p>
      )}
    </div>
  );
}
