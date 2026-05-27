import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ((props: { error: Error | null; resetError: () => void }) => ReactNode) | ReactNode;
  errorMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return (this.props.fallback as (props: { error: Error | null; resetError: () => void }) => ReactNode)({
            error: this.state.error,
            resetError: this.handleReset,
          });
        }
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/30 rounded-full mb-6">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-md">
              {this.state.error?.message?.slice(0, 120) || 'An unexpected error occurred.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={this.handleReset} className="px-6 py-3 bg-green-400 text-black rounded-full hover:bg-green-500 transition-colors font-medium text-sm">Try Again</button>
              <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors text-sm">Reload Page</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
