import { useState } from 'react';
import { useAuth } from '@contexts/StacksAuthContext';
import { useDemoMode } from '@contexts/DemoModeContext';
import RoleSelector from './RoleSelector';

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'role', label: 'Choose Role' },
  { id: 'confirm', label: 'Confirm' },
];

export default function OnboardingWizard({ onComplete }) {
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const { enterDemoMode } = useDemoMode();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleComplete = () => {
    setIsCompleting(true);
    onComplete(selectedRole);
  };

  const handleDemoContinue = () => {
    enterDemoMode(selectedRole);
    setIsCompleting(true);
    onComplete(selectedRole);
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to CineX</h1>
              <p className="text-gray-400">
                The financial infrastructure for Africa's creative economy.
                Connect your wallet or continue as a guest to get started.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={signIn}
                disabled={authLoading}
                className="w-full py-3 px-6 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
              >
                {authLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
              <p className="text-gray-600 text-sm">or</p>
              <button
                onClick={() => { setCurrentStep(1); }}
                className="w-full py-3 px-6 bg-gray-800 text-gray-300 font-medium rounded-xl hover:bg-gray-700 transition"
              >
                Continue without wallet
              </button>
            </div>
          </div>
        );

      case 'role':
        return (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Choose your role</h2>
            <p className="text-gray-400 mb-6 text-center text-sm">
              Select how you want to participate in the creative economy
            </p>
            <RoleSelector onSelect={setSelectedRole} />
            <div className="flex justify-between mt-8">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedRole}
                className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="mb-6">
              <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                You're all set as a <span className="text-yellow-400 capitalize">{selectedRole}</span>!
              </h2>
              <p className="text-gray-400">
                {selectedRole === 'creative'
                  ? 'Create campaigns, build your reputation, and showcase your portfolio.'
                  : 'Discover projects, earn yield, and support the creative economy.'}
              </p>
            </div>
            <div className="space-y-3">
              {isAuthenticated ? (
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="w-full py-3 px-6 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
                >
                  {isCompleting ? 'Setting up...' : 'Go to Dashboard'}
                </button>
              ) : (
                <button
                  onClick={handleDemoContinue}
                  disabled={isCompleting}
                  className="w-full py-3 px-6 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
                >
                  {isCompleting ? 'Setting up...' : 'Enter Demo Mode'}
                </button>
              )}
              <button
                onClick={handleBack}
                className="text-sm text-gray-500 hover:text-gray-300 transition"
              >
                Change role
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-12">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  i <= currentStep
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 transition-all ${
                    i < currentStep ? 'bg-yellow-400' : 'bg-gray-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {renderStep()}
      </div>
    </div>
  );
}
