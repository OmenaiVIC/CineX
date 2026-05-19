import { useState } from 'react';

const ROLES = [
  {
    id: 'creative',
    title: 'Creative',
    description: 'Fund your next project. Build your reputation. Showcase your portfolio.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
    features: ['Create campaigns & raise STX', 'Build on-chain reputation', 'Showcase your portfolio'],
  },
  {
    id: 'backer',
    title: 'Backer',
    description: 'Discover emerging talent. Earn yield on your STX. Support the creative economy.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    features: ['Discover & back creative projects', 'Earn yield on your STX', 'Join tribes & co-invest'],
  },
];

export default function RoleSelector({ onSelect }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (roleId) => {
    setSelected(roleId);
    onSelect(roleId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ROLES.map((role) => {
        const isSelected = selected === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => handleSelect(role.id)}
            aria-label={`Select ${role.title} role`}
            aria-pressed={isSelected}
            className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
              isSelected
                ? 'border-yellow-400 bg-yellow-400/5'
                : 'border-gray-700 bg-black hover:border-gray-500'
            }`}
          >
            {isSelected && (
              <span className="absolute top-3 right-3 text-yellow-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
            )}
            <div className={`mb-3 ${isSelected ? 'text-yellow-400' : 'text-gray-400'}`}>
              {role.icon}
            </div>
            <h3 className={`text-lg font-semibold mb-1 ${isSelected ? 'text-yellow-300' : 'text-white'}`}>
              {role.title}
            </h3>
            <p className="text-sm text-gray-400 mb-3">{role.description}</p>
            <ul className="space-y-1">
              {role.features.map((f, i) => (
                <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="text-yellow-400/60">&bull;</span>
                  {f}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
