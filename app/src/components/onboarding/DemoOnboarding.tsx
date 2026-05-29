import { useState, useMemo } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { UserRole } from '../../types';

interface Props {
  onComplete: (name: string, role: UserRole) => void;
}

function generatePreviewAddress(name: string, role: string): string {
  const input = name.toLowerCase().trim() + ':' + role;
  let h1 = 0, h2 = 0, h3 = 0, h4 = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 << 5) - h1) + c;
    h2 = ((h2 << 7) - h2) + c * 3;
    h3 = ((h3 << 9) - h3) + c * 7;
    h4 = ((h4 << 11) - h4) + c * 13;
    h1 |= 0; h2 |= 0; h3 |= 0; h4 |= 0;
  }
  const parts = [Math.abs(h1), Math.abs(h2), Math.abs(h3), Math.abs(h4)];
  const hex = parts.map(h => h.toString(16).padStart(8, '0')).join('').toUpperCase();
  return 'ST' + hex.slice(0, 38);
}

export default function DemoOnboarding({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState<'name' | 'role' | 'ready'>('name');

  const handleNameSubmit = () => {
    if (!name.trim()) return;
    setStep('role');
  };

  const handleRoleSelect = (r: UserRole) => {
    setRole(r);
    setStep('ready');
  };

  const handleStart = () => {
    if (name.trim() && role) {
      onComplete(name.trim(), role);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CineX Demo</h1>
          <p className="text-gray-400">Experience the Creative Media Financing Solution</p>
        </div>

        <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-8">
          {step === 'name' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">What should we call you?</h2>
              <p className="text-sm text-gray-400">Your name will be used to generate your platform identity.</p>
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleNameSubmit()}
              />
              <Button variant="primary" onClick={handleNameSubmit} disabled={!name.trim()}>
                Continue
              </Button>
            </div>
          )}

          {step === 'role' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Choose your role</h2>
              <p className="text-sm text-gray-400">This shapes your dashboard and available actions.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRoleSelect('creative')}
                  className="p-6 rounded-xl border border-gray-800 hover:border-[#4ade80] hover:bg-[rgba(74,222,128,0.05)] transition-all text-left group"
                >
                  <span className="text-2xl block mb-2">🎬</span>
                  <span className="font-semibold text-white group-hover:text-[#4ade80]">Creative</span>
                  <p className="text-xs text-gray-500 mt-1">Launch campaigns, manage milestones, receive funding</p>
                </button>
                <button
                  onClick={() => handleRoleSelect('backer')}
                  className="p-6 rounded-xl border border-gray-800 hover:border-[#4ade80] hover:bg-[rgba(74,222,128,0.05)] transition-all text-left group"
                >
                  <span className="text-2xl block mb-2">🤝</span>
                  <span className="font-semibold text-white group-hover:text-[#4ade80]">Backer</span>
                  <p className="text-xs text-gray-500 mt-1">Fund campaigns, vote on milestones, earn rewards</p>
                </button>
              </div>
            </div>
          )}

          {step === 'ready' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-[#4ade80]/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-[#4ade80] text-2xl">✓</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Ready to go!</h2>
              <p className="text-sm text-gray-400">
                Welcome, <span className="text-[#4ade80] font-medium">{name}</span>! You're joining as a <span className="text-white font-medium">{role}</span>.
              </p>
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-mono break-all">
                  Your address: {generatePreviewAddress(name, role)}
                </p>
              </div>
              <Button variant="neon" onClick={handleStart}>
                Enter CineX Demo
              </Button>
              <button
                onClick={() => setStep('name')}
                className="block w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
