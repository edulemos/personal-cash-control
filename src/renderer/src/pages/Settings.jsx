import React, { useEffect, useState } from 'react';
import { Cloud, Download, Upload, LogOut, Loader2, AlertTriangle, RefreshCw, CheckCircle2, Clock, Zap } from 'lucide-react';
import clsx from 'clsx';

export default function Settings({ updateStatus, setUpdateStatus, appVersion, user, setUser }) {
  const [gdriveStatus, setGdriveStatus] = useState({ isAuthenticated: false, email: null, lastBackup: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [autoBackup, setAutoBackup] = useState({ interval: 'daily', lastBackup: null, nextBackup: null });
  const [autoBackupLoading, setAutoBackupLoading] = useState(false);
  const [manualBackupLoading, setManualBackupLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchAutoBackupConfig();
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

  const fetchAutoBackupConfig = async () => {
    try {
      const config = await window.api.getAutoBackupConfig();
      setAutoBackup(config);
    } catch (err) {
      console.error('Erro ao carregar config de auto-backup:', err);
    }
  };

  const handleAutoBackupChange = async (interval) => {
    setAutoBackupLoading(true);
    try {
      const result = await window.api.setAutoBackupInterval(interval);
      if (result.success !== false) {
        setAutoBackup({ interval: result.interval, lastBackup: result.lastBackup, nextBackup: result.nextBackup });
      }
    } catch (err) {
      console.error('Erro ao salvar auto-backup:', err);
    } finally {
      setAutoBackupLoading(false);
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

  const handleGoogleAccountLogout = async () => {
    if (!confirm('Deseja sair da sua conta Google? Você precisará fazer login novamente.')) return;
    setActionLoading(true);
    await window.api.gdriveLogout();
    // Limpa sessão do app
    localStorage.removeItem('cashControlUser');
    if (setUser) setUser(null);
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

      {/* Seção de Conta Google */}
      <div className="glass-panel p-8 max-w-3xl mb-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0">
              {user?.picture
                ? <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-accent/30 flex items-center justify-center text-accent font-bold text-2xl">{user?.name?.[0]?.toUpperCase()}</div>}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{user?.name || 'Usuário'}</h3>
              <p className="text-sm text-text-muted">{user?.email || gdriveStatus.email}</p>
              <p className="text-xs text-text-muted mt-1">Conta Google vinculada</p>
            </div>
          </div>
          <button
            onClick={handleGoogleAccountLogout}
            disabled={actionLoading}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        </div>
      </div>

      {/* Seção de Backup Google Drive */}
      <div className="glass-panel p-8 max-w-3xl">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Cloud size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Backup no Google Drive</h3>
            <p className="text-text-muted mt-1 text-sm">
              Mantenha seus dados financeiros seguros salvando uma cópia na sua conta Google Drive.
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

      {/* Seção de Backup Automático */}
      <div className="glass-panel p-8 max-w-3xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap size={24} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold">Backup Automático</h3>
              {autoBackup.interval !== 'off' ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Ativo</span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-text-muted border border-white/10">Inativo</span>
              )}
            </div>
            <p className="text-text-muted mt-1 text-sm">
              Envie o backup para o Google Drive automaticamente, sem precisar lembrar.
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
          {/* Seletor de frequência */}
          <div>
            <label className="block text-sm font-medium mb-3">Frequência do backup</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'off',        label: 'Desativado' },
                { value: 'daily',      label: 'Diário' },
                { value: 'every3days', label: 'A cada 3 dias' },
                { value: 'weekly',     label: 'Semanal' },
              ].map(option => (
                <button
                  key={option.value}
                  id={`auto-backup-${option.value}`}
                  onClick={() => handleAutoBackupChange(option.value)}
                  disabled={autoBackupLoading}
                  className={clsx(
                    'px-3 py-2.5 rounded-lg text-sm font-medium transition-all border',
                    autoBackup.interval === option.value
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10 hover:text-white'
                  )}
                >
                  {autoBackupLoading && autoBackup.interval === option.value
                    ? <Loader2 size={14} className="animate-spin mx-auto" />
                    : option.label
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Próximo backup */}
          {autoBackup.interval !== 'off' && (
            <div className="flex items-center gap-3 text-sm pt-1 border-t border-white/5">
              <Clock size={15} className="text-text-muted shrink-0" />
              {autoBackup.nextBackup ? (
                <span className="text-text-muted">
                  Próximo backup: <strong className="text-white">
                    {new Date(autoBackup.nextBackup).toLocaleString('pt-BR')}
                  </strong>
                </span>
              ) : (
                <span className="text-text-muted">O backup será feito na próxima vez que o app abrir.</span>
              )}
            </div>
          )}

          {/* Último backup */}
          {autoBackup.lastBackup && (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span className="text-text-muted">
                Último backup: <strong className="text-white">{new Date(autoBackup.lastBackup).toLocaleString('pt-BR')}</strong>
              </span>
            </div>
          )}

          {/* Backup manual — aparece somente quando o automático está desativado */}
          {autoBackup.interval === 'off' && (
            <div className="pt-1 border-t border-white/5">
              <p className="text-xs text-text-muted mb-3">Como o backup automático está desativado, você pode salvar manualmente a qualquer momento.</p>
              <button
                id="btn-manual-backup"
                onClick={async () => {
                  setManualBackupLoading(true);
                  setError(null);
                  setSuccess(null);
                  try {
                    const result = await window.api.gdriveBackup();
                    if (result.success) {
                      setSuccess('Backup concluído com sucesso!');
                      const config = await window.api.getAutoBackupConfig();
                      setAutoBackup(config);
                    } else {
                      setError(result.error || 'Erro ao realizar backup.');
                    }
                  } catch (err) {
                    setError('Erro ao realizar backup.');
                  } finally {
                    setManualBackupLoading(false);
                  }
                }}
                disabled={manualBackupLoading || actionLoading}
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {manualBackupLoading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Fazer Backup Agora
              </button>
            </div>
          )}
        </div>
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
