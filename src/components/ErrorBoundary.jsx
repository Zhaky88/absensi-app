import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SIAK Error Boundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      sessionStorage.clear();
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-lg font-bold text-white mb-2">Terjadi Kendala Tampilan</h1>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Aplikasi mendeteksi galat sementara pada modul tampilan. Silakan muat ulang halaman untuk memulihkan sesi.
            </p>

            {this.state.error && (
              <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 text-left mb-6 overflow-x-auto">
                <span className="text-[10px] font-mono text-rose-400 block break-words">
                  {this.state.error.toString()}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition font-semibold text-xs text-white shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-4 h-4 animate-spin-reverse" />
                <span>Muat Ulang Halaman</span>
              </button>
              <button
                onClick={this.handleResetStorage}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-[0.98] transition font-medium text-xs border border-slate-700/60"
              >
                <Home className="w-4 h-4" />
                <span>Beranda</span>
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
