import { useState } from 'react';

interface Step {
  num: number;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  points: string[];
}

const STEPS: Step[] = [
  {
    num: 1,
    title: 'Create Account',
    subtitle: 'Join the Network',
    icon: '◆',
    description: 'Sign up with email to join CineX. Your account becomes your identity on the platform — no passwords, no KYC friction.',
    points: [
      'Sign up with email in seconds',
      'No fees for account creation',
      'Your profile is your identity',
      'Free to join — no upfront costs',
    ],
  },
  {
    num: 2,
    title: 'Build Your Profile',
    subtitle: 'Establish Credibility',
    icon: '◈',
    description: 'Set up your creative profile with your portfolio, past work, and credentials. Gatekeepers vouch for verified filmmakers — building trust with potential backers.',
    points: [
      'Display name, bio, and profile photo',
      'Add portfolio items with media links',
      'Receive credibility ratings from peers',
      'Gatekeeper verification boosts trust',
    ],
  },
  {
    num: 3,
    title: 'Launch a Campaign',
    subtitle: 'Structure Your Project',
    icon: '◇',
    description: 'Create a campaign with your project details, funding target, and milestone plan. Each milestone defines deliverables, required funding, and a timeline.',
    points: [
      'Set campaign title, description, and category',
      'Define funding target and deadline',
      'Create milestones with specific deliverables',
      'Funds release only when milestones are verified',
    ],
  },
  {
    num: 4,
    title: 'Raise Funds',
    subtitle: 'Community-Powered Capital',
    icon: '⟁',
    description: 'Backers discover and contribute to your campaign. All funds are held in milestone-gated escrow — safe, transparent, and earning yield while your project develops.',
    points: [
      'Backers contribute with NGN, USD, or credits',
      'Funds held in secure escrow',
      'Idle capital earns yield automatically',
      'Real-time contribution tracking and analytics',
    ],
  },
  {
    num: 5,
    title: 'Deliver & Verify',
    subtitle: 'Milestone-Based Release',
    icon: '✓',
    description: 'Complete each milestone and submit deliverables. Backers and gatekeepers vote to verify. Once approved, the next funding tranche unlocks automatically.',
    points: [
      'Submit deliverables for each milestone',
      'Backers vote based on contribution weight',
      'Gatekeepers provide professional verification',
      'Funds release automatically on approval',
    ],
  },
  {
    num: 6,
    title: 'Complete & Earn',
    subtitle: 'Shared Success',
    icon: '★',
    description: 'When all milestones are complete, the project is finalized. Creators earn a success bonus. Backers get their principal plus a share of the escrow yield.',
    points: [
      'Creator receives success bonus (10% of yield)',
      'Backers earn yield on idle capital (70% share)',
      'Platform fee funds operations (20% share)',
      'Full project history recorded and public',
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksGuide({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const s = STEPS[step];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl mx-4 bg-[#0a0a0f] border border-[#1a1a2e] rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: '0 0 60px rgba(74,222,128,0.08)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors z-10"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left: Step indicator */}
          <div className="w-full md:w-64 shrink-0 bg-gradient-to-b from-[#0d0d1a] to-[#0a0a0f] border-b md:border-b-0 md:border-r border-[#1a1a2e] p-8">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-6">The Lifecycle</div>
            <div className="flex md:flex-col gap-0">
              {STEPS.map((st, i) => (
                <button
                  key={st.num}
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-3 py-3 px-3 rounded-lg transition-all text-left ${
                    i === step
                      ? 'bg-[rgba(74,222,128,0.1)] text-[#4ade80]'
                      : i < step
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-all ${
                      i === step
                        ? 'bg-[#4ade80] text-black border-[#4ade80]'
                        : i < step
                          ? 'bg-[rgba(74,222,128,0.15)] text-[#4ade80] border-[rgba(74,222,128,0.3)]'
                          : 'bg-gray-800 text-gray-500 border-gray-700'
                    }`}
                  >
                    {i < step ? '✓' : st.num}
                  </span>
                  <span className="text-sm leading-tight hidden md:inline">{st.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex-1 p-8 md:p-10 min-h-[400px] flex flex-col">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.subtitle}</div>
                  <h3 className="text-xl font-bold text-white">{s.title}</h3>
                </div>
              </div>

              {/* Step counter */}
              <div className="mt-1 mb-6 text-xs text-gray-600">
                Step {s.num} of {total}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed mb-6">{s.description}</p>

              {/* Key points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {s.points.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0" />
                    <span className="text-gray-300">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1a1a2e]">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === step ? 'bg-[#4ade80] w-6' : i < step ? 'bg-[rgba(74,222,128,0.3)]' : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-5 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-full transition-all"
                  >
                    ← Previous
                  </button>
                )}
                {step < total - 1 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="px-6 py-2 text-sm font-medium text-black bg-[#4ade80] hover:bg-[#22c55e] rounded-full transition-all"
                    style={{ boxShadow: '0 0 20px rgba(74,222,128,0.2)' }}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-medium text-black bg-[#4ade80] hover:bg-[#22c55e] rounded-full transition-all"
                    style={{ boxShadow: '0 0 20px rgba(74,222,128,0.2)' }}
                  >
                    Got It
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
