import React, { useEffect, useState } from 'react';
import { Cloud, Download, Upload, LogIn, LogOut, Loader2, AlertTriangle, RefreshCw, CheckCircle2, User } from 'lucide-react';
import clsx from 'clsx';

export default function Settings({ updateStatus, setUpdateStatus, appVersion, user, setUser }) {
  const [gdriveStatus, setGdriveStatus] = useState({ isAuthenticated: false, email: null, lastBackup: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Profile State
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', username: user?.username || '', currentPassword: '', newPassword: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);

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

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.currentPassword) {
      setProfileError('A senha atual é obrigatória para salvar as alterações.');
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const result = await window.api.updateProfile(user.id, profileForm);
      if (result.success) {
        setProfileSuccess('Perfil atualizado com sucesso!');
        setUser(result.user);
        // Atualiza localStorage se usarmos cashControlUser
        localStorage.setItem('cashControlUser', JSON.stringify(result.user));
        setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
      } else {
        setProfileError(result.message || 'Erro ao atualizar perfil.');
      }
    } catch (err) {
      setProfileError('Ocorreu um erro inesperado.');
    } finally {
      setProfileLoading(false);
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
        setSuccess('Base de dados restaurada com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          localStorage.removeItem('cashControlUser');
          if (setUser) {
            setUser(null);
          } else {
            window.location.reload();
          }
        }, 1500);
      } else {
        setError(result.error || 'Erro ao restaurar backup.');
        setActionLoading(false);
      }
    } catch (err) {
      setError('Erro ao restaurar backup: ' + (err.message || 'Falha na comunicação.'));
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

      {/* Seção de Perfil */}
      <div className="glass-panel p-8 max-w-3xl mb-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent flex items-center justify-center shrink-0">
            <User size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Editar Perfil</h3>
            <p className="text-text-muted mt-1 text-sm">
              Altere seu nome, nome de usuário ou senha de acesso.
            </p>
          </div>
        </div>

        {profileError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex gap-3 text-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <p>{profileError}</p>
          </div>
        )}

        {profileSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 text-sm">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Nome</label>
              <input type="text" className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Nome de Usuário</label>
              <input type="text" className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} required />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Nova Senha (opcional)</label>
              <input type="password" placeholder="Deixe em branco para não alterar" className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white" value={profileForm.newPassword} onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-rose-400 mb-1 block">Senha Atual (obrigatória para salvar)</label>
              <input type="password" placeholder="Sua senha atual" className="w-full bg-black/30 border border-rose-500/30 rounded-lg p-3 outline-none focus:border-rose-500 text-white" value={profileForm.currentPassword} onChange={e => setProfileForm({...profileForm, currentPassword: e.target.value})} required />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              disabled={profileLoading}
              className="bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {profileLoading ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

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

      {/* Seção de Atualizações */}
      <div className="glass-panel p-8 max-w-3xl mb-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <RefreshCw size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Atualizações</h3>
            <p className="text-text-muted mt-1 text-sm">
              Mantenha seu aplicativo na versão mais recente para receber novos recursos e correções.
              {appVersion && <span className="block mt-1">Versão atual: <strong className="text-white">v{appVersion}</strong></span>}
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          {!updateStatus ? (
             <div className="flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
                <h4 className="font-semibold mb-1">Seu aplicativo está atualizado</h4>
                <p className="text-sm text-text-muted mb-4">Ou não verificamos recentemente.</p>
                <button 
                  onClick={() => window.api.checkUpdate()}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Verificar Atualizações
                </button>
             </div>
          ) : updateStatus === 'available' ? (
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div>
                 <h4 className="font-semibold text-blue-400 mb-1">Nova atualização disponível!</h4>
                 <p className="text-sm text-text-muted">Baixe agora para aproveitar as novidades.</p>
               </div>
               <button 
                  onClick={() => {
                    setUpdateStatus('downloading');
                    window.api.downloadUpdate();
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Baixar Atualização
                </button>
             </div>
          ) : updateStatus === 'downloading' ? (
             <div className="flex flex-col items-center justify-center text-center">
                <Loader2 size={32} className="text-blue-400 animate-spin mb-3" />
                <h4 className="font-semibold mb-1">Baixando atualização...</h4>
                <p className="text-sm text-text-muted">Isso pode levar alguns minutos. Você será avisado quando terminar.</p>
             </div>
          ) : updateStatus === 'downloaded' ? (
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div>
                 <h4 className="font-semibold text-emerald-400 mb-1">Atualização pronta!</h4>
                 <p className="text-sm text-text-muted">Reinicie o aplicativo para instalar a nova versão.</p>
               </div>
               <button 
                  onClick={() => window.api.installUpdate()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  Reiniciar e Instalar
                </button>
             </div>
          ) : updateStatus === 'error' ? (
             <div className="flex flex-col items-center justify-center text-center">
                <AlertTriangle size={32} className="text-rose-400 mb-3" />
                <h4 className="font-semibold mb-1">Erro ao atualizar</h4>
                <p className="text-sm text-text-muted mb-4">Ocorreu um problema ao baixar ou verificar a atualização.</p>
                <button 
                  onClick={() => setUpdateStatus(null)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Tentar Novamente
                </button>
             </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
