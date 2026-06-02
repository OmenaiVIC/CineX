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
    title: 'Get Verified',
    subtitle: 'On-Chain Identity Registration',
    icon: '◆',
    description: 'Call register-creator on the project-verification-module contract. Your name and project vertical are recorded on-chain, creating a verifiable identity that backers and gatekeepers can trust.',
    points: [
      'Register your name and project vertical on-chain',
      'Transaction signed by your Stacks wallet',
      'Identity stored immutably on the blockchain',
      'Step 1 of the demo — live testnet contract call',
    ],
  },
  {
    num: 2,
    title: 'Create Escrow Campaign',
    subtitle: 'Milestone-Gated Funding',
    icon: '◈',
    description: 'Call create-campaign on the milestone-escrow contract. Define your campaign ID, funding goal, and milestones. Each milestone has a name and amount — funds only release when work is verified.',
    points: [
      'Set campaign ID, funding goal, and milestones',
      'Each milestone defined with name and release amount',
      'Funds locked in escrow — only the contract controls disbursement',
      'Step 2 of the demo — live testnet contract call',
    ],
  },
  {
    num: 3,
    title: 'Backers Fund Escrow',
    subtitle: 'Trustless Deposits',
    icon: '◇',
    description: 'Backers deposit STX into the escrow contract via the deposit function. The contract holds all funds. No one — not even the creator — can withdraw without milestone verification.',
    points: [
      'Deposits go directly to the escrow contract',
      'Contract tracks total deposits per campaign',
      'Funds are non-custodial — held by contract logic',
      'No withdrawal possible without verified milestones',
    ],
  },
  {
    num: 4,
    title: 'Submit Proof of Work',
    subtitle: 'On-Chain Deliverables',
    icon: '⟁',
    description: 'Complete a milestone and submit proof by calling submit-milestone-proof. The submission is recorded on-chain, proving the work was done. Photos, videos, and files can be referenced as evidence.',
    points: [
      'Submit proof for each completed milestone',
      'Proof can reference media URLs or endorser sign-off',
      'Submission is recorded immutably on-chain',
      'Visible to endorsers, backers, and the public',
    ],
  },
  {
    num: 5,
    title: 'Endorse & Release',
    subtitle: 'Verified Milestone Payout',
    icon: '✓',
    description: 'An endorser calls approve-milestone to verify the submission on-chain. If approved, release-milestone-funds transfers the milestone amount from escrow to the creator. Failed milestones can be disputed.',
    points: [
      'Endorser verifies the submission on-chain',
      'Approved milestones trigger automatic fund release',
      'STX transferred from escrow to creator via as-contract',
      'Failed or fraudulent milestones can be rejected',
    ],
  },
  {
    num: 6,
    title: 'Project Finalized',
    subtitle: 'Full Lifecycle Recorded',
    icon: '★',
    description: 'When all milestones are released, the campaign is complete. The entire lifecycle — registration, campaign creation, deposits, proof submissions, endorsements, and payouts — is recorded on-chain.',
    points: [
      'All milestones released or settled',
      'Complete lifecycle verifiable on-chain',
      'Creator builds on-chain reputation for future projects',
      'Backers can audit every release decision',
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
