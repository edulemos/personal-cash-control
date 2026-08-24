import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleClearSession = () => {
    localStorage.removeItem('cashControlUser');
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0b0f19] text-white flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#131b2e] border border-rose-500/20 rounded-2xl p-8 shadow-2xl text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-2xl font-bold mb-2">Ops! Algo deu errado</h1>
            <p className="text-slate-400 text-sm mb-6">
              Ocorreu um erro inesperado na exibição da interface. Seus dados continuam salvos e seguros.
            </p>

            {this.state.error?.message && (
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 mb-6 text-left">
                <p className="text-xs text-rose-300 font-mono break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <RefreshCw size={18} />
                Recarregar Aplicativo
              </button>

              <button
                onClick={this.handleClearSession}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 text-sm"
              >
                <LogOut size={18} />
                Limpar Sessão e Ir para Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
