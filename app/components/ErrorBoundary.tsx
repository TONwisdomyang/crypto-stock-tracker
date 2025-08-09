'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service (e.g., Sentry)
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return this.props.fallback || (
        <div className="bg-slate-800 rounded-xl border border-red-500 p-6 m-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">⚠️</div>
            <h2 className="text-xl font-semibold text-red-400">發生錯誤</h2>
          </div>
          <div className="space-y-3">
            <p className="text-slate-300">
              抱歉，這個組件發生了錯誤。請重新載入頁面或聯繫技術支援。
            </p>
            <div className="bg-slate-700 rounded-lg p-3 font-mono text-sm text-slate-400 overflow-auto">
              {this.state.error?.message || '未知錯誤'}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              重新載入頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;