import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-lg w-full text-center border border-slate-200">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Bir Hata Oluştu</h1>
            <p className="text-slate-600 mb-6">
              Uygulama beklenmedik bir hatayla karşılaştı. Lütfen sayfayı yenilemeyi deneyin.
            </p>
            
            <div className="bg-slate-100 rounded-lg p-4 mb-6 text-left overflow-auto max-h-40 text-xs font-mono text-slate-700">
              <p className="font-semibold text-red-600 mb-1">{this.state.error?.toString()}</p>
              {this.state.errorInfo?.componentStack}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              <RefreshCw size={18} />
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
