import type { TxLifecycleState } from '../../types';

interface Step {
  key: TxLifecycleState;
  label: string;
}

const STEPS: Step[] = [
  { key: 'building', label: 'Preparing transaction' },
  { key: 'signing', label: 'Awaiting signature' },
  { key: 'broadcasting', label: 'Sending to network' },
  { key: 'confirming', label: 'Waiting for confirmation' },
  { key: 'confirmed', label: 'Confirmed' },
];

function stateIndex(state: TxLifecycleState): number {
  if (state === 'failed' || state === 'cancelled') return -1;
  const idx = STEPS.findIndex(s => s.key === state);
  return idx >= 0 ? idx : STEPS.length;
}

interface Props {
  state: TxLifecycleState;
}

export default function TxStatusTimeline({ state }: Props) {
  const activeIdx = stateIndex(state);
  const isError = state === 'failed';
  const isCancelled = state === 'cancelled';
  const isConfirmed = state === 'confirmed';

  return (
    <div className="space-y-3">
      {STEPS.map((step, i) => {
        const isComplete = activeIdx > i || isConfirmed;
        const isCurrent = activeIdx === i && !isConfirmed;
        const isFailedStep = isError && activeIdx === i;
        const isSkipped = isCancelled && activeIdx < i;

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {isComplete ? (
                <div className="w-6 h-6 rounded-full bg-[#4ade80] flex items-center justify-center">
                  <span className="text-black text-xs font-bold">✓</span>
                </div>
              ) : isFailedStep ? (
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✕</span>
                </div>
              ) : isSkipped ? (
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">—</span>
                </div>
              ) : isCurrent ? (
                <div className="w-6 h-6 rounded-full border-2 border-[#4ade80] border-t-transparent animate-spin" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700" />
              )}
            </div>
            <span className={`text-sm ${
              isComplete ? 'text-[#4ade80]'
              : isFailedStep ? 'text-red-400'
              : isSkipped ? 'text-gray-600'
              : isCurrent ? 'text-white font-medium'
              : 'text-gray-500'
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
