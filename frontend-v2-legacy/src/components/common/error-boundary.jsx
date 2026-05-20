import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback;
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({ error: this.state.error, resetError: this.handleReset })
          : fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-900/30 rounded-full mb-6">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 text-sm mb-6 max-w-md">
              {this.props.errorMessage ||
                (this.state.error?.message
                  ? `${this.state.error.message.slice(0, 120)}`
                  : 'An unexpected error occurred.')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-green-400 text-black rounded-full hover:bg-green-500 transition-colors font-medium text-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition-colors text-sm"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
