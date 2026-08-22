import React, { useEffect, useState } from 'react';
import { Cloud, Download, Upload, LogIn, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export default function Settings() {
  const [gdriveStatus, setGdriveStatus] = useState({ isAuthenticated: false, email: null, lastBackup: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const status = await window.api.gdriveStatus();
      setGdriveStatus(status);
    } catch (err) {
      console.error(err);
      setError('Não foi possível verificar o status do Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await window.api.gdriveLogin();
      if (result.success) {
        setSuccess('Conectado com sucesso!');
        fetchStatus();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erro ao abrir tela de login.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading(true);
    await window.api.gdriveLogout();
    setSuccess('Desconectado do Google Drive.');
    fetchStatus();
    setActionLoading(false);
  };

  const handleBackup = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.api.gdriveBackup();
      if (result.success) {
        setSuccess('Backup concluído com sucesso!');
        fetchStatus();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Erro ao realizar backup.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('ATENÇÃO: Restaurar o backup vai sobrescrever todos os dados atuais do seu aplicativo pelas informações que estão no Google Drive. Esta ação não pode ser desfeita. Tem certeza?')) {
      return;
    }
    
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.api.gdriveRestore();
      if (result.success) {
        // App will relaunch, but just in case:
        setSuccess('Restauração concluída! O aplicativo será reiniciado.');
      } else {
        setError(result.error);
        setActionLoading(false);
      }
    } catch (err) {
      setError('Erro ao restaurar backup.');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-text-muted">Ajustes e backup do sistema</p>
      </header>

      <div className="glass-panel p-8 max-w-3xl">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Cloud size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Backup no Google Drive</h3>
            <p className="text-text-muted mt-1 text-sm">
              Mantenha seus dados financeiros seguros salvando uma cópia criptografada na sua conta do Google Drive.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex gap-3 text-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 text-sm">
            {success}
          </div>
        )}

        {!gdriveStatus.isAuthenticated ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="mb-4 text-text-muted">Você ainda não conectou uma conta do Google Drive.</p>
            <button 
              onClick={handleLogin}
              disabled={actionLoading}
              className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
              Conectar ao Google Drive
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm text-text-muted">Conectado como:</p>
                <p className="font-semibold">{gdriveStatus.email || 'Conta vinculada'}</p>
              </div>
              <button 
                onClick={handleLogout}
                disabled={actionLoading}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                <LogOut size={16} />
                Desconectar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2">Fazer Backup</h4>
                <p className="text-xs text-text-muted mb-4 min-h-[40px]">
                  Envia a base de dados atual para o Drive. <br/>
                  {gdriveStatus.lastBackup 
                    ? `Último backup: ${new Date(gdriveStatus.lastBackup).toLocaleString('pt-BR')}`
                    : 'Nenhum backup realizado ainda.'}
                </p>
                <button 
                  onClick={handleBackup}
                  disabled={actionLoading}
                  className="w-full bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg font-medium transition-colors inline-flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                  Backup Agora
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2 text-rose-400">Restaurar Dados</h4>
                <p className="text-xs text-text-muted mb-4 min-h-[40px]">
                  Baixa o último backup do Drive e substitui os dados atuais deste computador.
                </p>
                <button 
                  onClick={handleRestore}
                  disabled={actionLoading}
                  className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-4 py-2.5 rounded-lg font-medium transition-colors inline-flex justify-center items-center gap-2 disabled:opacity-50 border border-rose-500/20"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                  Restaurar Backup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
