import React, { useEffect, useState } from 'react';
import { Cloud, Download, Upload, LogOut, Loader2, AlertTriangle, RefreshCw, CheckCircle2, Clock, Zap, ShieldCheck, ShieldOff, Lock, Sparkles, Key, Eye, EyeOff, Trash2, ExternalLink } from 'lucide-react';
import clsx from 'clsx';

export default function Settings({ updateStatus, setUpdateStatus, appVersion, user, setUser }) {
  const [gdriveStatus, setGdriveStatus] = useState({ isAuthenticated: false, hasDriveScope: false, email: null, lastBackup: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [autoBackup, setAutoBackup] = useState({ interval: 'daily', lastBackup: null, nextBackup: null });
  const [autoBackupLoading, setAutoBackupLoading] = useState(false);
  const [manualBackupLoading, setManualBackupLoading] = useState(false);

  // Estado do PIN
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(null); // 'set' | 'disable'
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  // Estado do Gemini AI
  const [geminiStatus, setGeminiStatus] = useState({ hasKey: false, isConfigured: false });
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiMessage, setGeminiMessage] = useState(null);
  const [editingGeminiKey, setEditingGeminiKey] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchAutoBackupConfig();
    fetchPinStatus();
    fetchGeminiStatus();
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

  const fetchPinStatus = async () => {
    try {
      const status = await window.api.pinStatus(user.id);
      setPinEnabled(status.enabled);
    } catch (err) {
      console.error('Erro ao buscar status do PIN:', err);
    }
  };

  const fetchGeminiStatus = async () => {
    try {
      if (window.api && window.api.geminiStatus) {
        const status = await window.api.geminiStatus();
        setGeminiStatus(status);
      }
    } catch (err) {
      console.error('Erro ao buscar status do Gemini:', err);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) {
      setGeminiMessage({ type: 'error', text: 'Informe a chave de API do Gemini.' });
      return;
    }
    setGeminiLoading(true);
    setGeminiMessage(null);
    try {
      const res = await window.api.geminiSaveKey(geminiKeyInput.trim());
      if (res.success) {
        setGeminiMessage({ type: 'success', text: 'Chave do Gemini verificada e ativada com sucesso!' });
        setGeminiKeyInput('');
        setEditingGeminiKey(false);
        fetchGeminiStatus();
      } else {
        setGeminiMessage({ type: 'error', text: res.error || 'Chave inválida ou não autorizada pela API Google.' });
      }
    } catch (err) {
      setGeminiMessage({ type: 'error', text: 'Erro ao validar chave: ' + (err.message || 'Falha de conexão.') });
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleRemoveGeminiKey = async () => {
    if (!confirm('Deseja realmente remover a chave da API do Gemini? O recurso de leitura e conciliação de faturas/extratos por IA será desabilitado.')) {
      return;
    }
    setGeminiLoading(true);
    setGeminiMessage(null);
    try {
      const res = await window.api.geminiRemoveKey();
      if (res.success) {
        setGeminiMessage({ type: 'success', text: 'Chave removida. As funções de IA foram desabilitadas.' });
        setGeminiKeyInput('');
        setEditingGeminiKey(false);
        fetchGeminiStatus();
      } else {
        setGeminiMessage({ type: 'error', text: res.error || 'Erro ao remover chave.' });
      }
    } catch (err) {
      setGeminiMessage({ type: 'error', text: 'Erro ao remover chave: ' + err.message });
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleEnablePin = async () => {
    setPinError('');
    const trimmed = pinInput.trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      setPinError('O PIN deve conter entre 4 e 8 dígitos numéricos.');
      return;
    }
    if (trimmed !== pinConfirm.trim()) {
      setPinError('Os PINs não coincidem.');
      return;
    }
    setPinLoading(true);
    try {
      const result = await window.api.pinSet(user.id, trimmed);
      if (result.success) {
        setPinEnabled(true);
        setShowPinModal(null);
        setPinInput('');
        setPinConfirm('');
      } else {
        setPinError(result.message || 'Erro ao definir PIN.');
      }
    } catch (err) {
      setPinError('Erro inesperado.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleDisablePin = async () => {
    setPinError('');
    const trimmed = pinInput.trim();
    if (!trimmed) {
      setPinError('Digite o PIN atual para desativar.');
      return;
    }
    setPinLoading(true);
    try {
      const verify = await window.api.pinVerify(user.id, trimmed);
      if (!verify.success) {
        setPinError('PIN incorreto.');
        setPinLoading(false);
        return;
      }
      await window.api.pinRemove(user.id);
      setPinEnabled(false);
      setShowPinModal(null);
      setPinInput('');
    } catch (err) {
      setPinError('Erro inesperado.');
    } finally {
      setPinLoading(false);
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

  const handleConnectDrive = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await window.api.gdriveLogin();
      if (res.success) {
        if (res.hasDriveScope) {
          setSuccess('Acesso ao Google Drive autorizado com sucesso!');
        } else {
          setError('Atenção: A permissão para gerenciar arquivos no Google Drive não foi marcada na tela do Google. Tente novamente clicando em "Autorizar Google Drive" e certifique-se de marcar a caixa de seleção de arquivos.');
        }
        await fetchStatus();
      } else {
        setError(res.error || 'Erro ao conectar ao Google Drive.');
      }
    } catch (err) {
      setError('Erro ao conectar ao Google Drive: ' + (err.message || 'Falha na comunicação.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!gdriveStatus.hasDriveScope) {
      setError('Permissão do Google Drive não autorizada. Clique em "Autorizar Google Drive" abaixo e marque a caixa de permissão na tela do Google.');
      return;
    }
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
      setError('Erro ao realizar backup: ' + (err.message || 'Erro inesperado'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!gdriveStatus.hasDriveScope) {
      setError('Permissão do Google Drive não autorizada. Clique em "Autorizar Google Drive" abaixo e marque a caixa de permissão na tela do Google.');
      return;
    }
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
    <>
    <div className="space-y-7 h-full overflow-y-auto pr-1 pb-6">
      <header>
        <p className="text-xs font-semibold tracking-wide text-accent uppercase mb-1">Preferências do aplicativo</p>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-sm text-text-muted mt-1">Conta, segurança, recursos e proteção dos seus dados.</p>
      </header>

      {/* Seção de Conta Google */}
      <div className="glass-panel p-5 max-w-6xl shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0">
              {user?.picture
                ? <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-accent/30 flex items-center justify-center text-accent font-bold text-2xl">{user?.name?.[0]?.toUpperCase()}</div>}
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Conta conectada</p>
              <h3 className="text-lg font-semibold">{user?.name || 'Usuário'}</h3>
              <p className="text-sm text-text-muted">{user?.email || gdriveStatus.email}</p>
            </div>
          </div>
          <button
            onClick={handleGoogleAccountLogout}
            disabled={actionLoading}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-3 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <LogOut size={16} />
            Sair da Conta
          </button>
        </div>
      </div>

      <section className="max-w-6xl">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Segurança e recursos</h3>
          <p className="text-xs text-text-muted mt-0.5">Controle o acesso ao app e os recursos inteligentes.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {/* Seção de Proteção por PIN */}
      <div className="glass-panel p-5 shadow-none">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            pinEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
          }`}>
            {pinEnabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">Proteção por PIN</h3>
              {pinEnabled ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Ativo</span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-text-muted border border-white/10">Inativo</span>
              )}
            </div>
            <p className="text-text-muted mt-1 text-sm">
              Adicione uma senha local de 4 a 8 dígitos para proteger o app. O login Google permanece ativo.
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{pinEnabled ? 'PIN ativado' : 'PIN desativado'}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {pinEnabled
                  ? 'O app exigirá o PIN na próxima vez que for aberto.'
                  : 'Qualquer um com acesso ao computador pode entrar no app.'}
              </p>
            </div>
            <button
              onClick={() => {
                setPinError('');
                setPinInput('');
                setPinConfirm('');
                setShowPinModal(pinEnabled ? 'disable' : 'set');
              }}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2',
                pinEnabled
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20'
                  : 'bg-accent hover:bg-accent-hover text-white'
              )}
            >
              <Lock size={15} />
              {pinEnabled ? 'Desativar PIN' : 'Ativar PIN'}
            </button>
          </div>

          {pinEnabled && (
            <div className="pt-3 border-t border-white/5">
              <button
                onClick={() => {
                  setPinError('');
                  setPinInput('');
                  setPinConfirm('');
                  setShowPinModal('set');
                }}
                className="text-sm text-text-muted hover:text-white transition-colors underline"
              >
                Alterar PIN
              </button>
            </div>
          )}

          <div className="flex items-start gap-2 pt-2 border-t border-white/5">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted">
              Esqueceu o PIN? Use o botão <strong className="text-white">"Esqueci meu PIN"</strong> na tela de bloqueio para recuperar acesso via login Google.
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Inteligência Artificial (Google Gemini) */}
      <div className="glass-panel p-5 shadow-none">
        <div className="flex items-start gap-3 mb-4">
          <div className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            geminiStatus.isConfigured ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-text-muted"
          )}>
            <Sparkles size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">Inteligência Artificial</h3>
              {geminiStatus.isConfigured ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ativo e Verificado
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-text-muted border border-white/10">
                  Não configurado
                </span>
              )}
            </div>
            <p className="text-text-muted mt-1 text-sm">
              Permite a leitura inteligente e conciliação automática de faturas de cartão de crédito e extratos bancários (PDF, OFX, CSV e imagens).
            </p>
          </div>
        </div>

        {geminiMessage && (
          <div className={clsx(
            "p-4 rounded-xl mb-5 text-sm flex items-center gap-2 border",
            geminiMessage.type === 'success'
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}>
            {geminiMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <p>{geminiMessage.text}</p>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
          {geminiStatus.isConfigured && !editingGeminiKey ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={16} /> API Key configurada e protegida
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Sua chave está criptografada com segurança em repouso no aplicativo. A conciliação por IA está totalmente habilitada.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingGeminiKey(true);
                      setGeminiMessage(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    Alterar Chave
                  </button>
                  <button
                    onClick={handleRemoveGeminiKey}
                    disabled={geminiLoading}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block font-medium">
                  {geminiStatus.isConfigured ? 'Nova Chave da API (Google Gemini)' : 'Chave da API do Google Gemini'}
                </label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={geminiKeyInput}
                    onChange={(e) => {
                      setGeminiKeyInput(e.target.value);
                      setGeminiMessage(null);
                    }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 pr-12 outline-none focus:border-accent text-white font-mono text-sm placeholder:text-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white p-1"
                    title={showGeminiKey ? "Ocultar chave" : "Mostrar chave"}
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-text-muted flex items-center gap-1">
                  <span>Não tem uma chave?</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    Obter chave gratuita no Google AI Studio <ExternalLink size={11} />
                  </a>
                </div>

                <div className="flex gap-2">
                  {editingGeminiKey && (
                    <button
                      onClick={() => {
                        setEditingGeminiKey(false);
                        setGeminiKeyInput('');
                        setGeminiMessage(null);
                      }}
                      disabled={geminiLoading}
                      className="px-4 py-2 text-sm text-text-muted hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={handleSaveGeminiKey}
                    disabled={geminiLoading || !geminiKeyInput.trim()}
                    className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {geminiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Verificar e Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
        </div>
      </section>

      <section className="max-w-6xl">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Dados e backup</h3>
          <p className="text-xs text-text-muted mt-0.5">Faça cópias, restaure informações e defina sua rotina de proteção.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      {/* Seção de Backup Google Drive */}
      <div className="glass-panel p-5 shadow-none">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Cloud size={20} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold">Backup no Google Drive</h3>
                {gdriveStatus.hasDriveScope ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Drive Conectado</span>
                ) : gdriveStatus.isAuthenticated ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20">Permissão Pendente</span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-text-muted border border-white/10">Desconectado</span>
                )}
              </div>
              <p className="text-text-muted mt-1 text-sm">
                Mantenha seus dados financeiros seguros salvando uma cópia na sua conta Google Drive.
              </p>
            </div>
          </div>
          {gdriveStatus.hasDriveScope && (
            <button
              onClick={handleConnectDrive}
              disabled={actionLoading}
              title="Renovar permissões ou reconectar ao Google Drive"
              className="text-xs text-text-muted hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} />
              Reconectar Drive
            </button>
          )}
        </div>

        {/* Alerta explicativo quando a permissão do Drive não foi concedida */}
        {!gdriveStatus.hasDriveScope && (
          <div className="bg-amber-500/10 border border-amber-500/25 text-amber-300 p-5 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Permissão de acesso ao Google Drive pendente</p>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  Sua conta Google está conectada, mas a permissão para gerenciar arquivos no Google Drive não foi autorizada.<br />
                  Clique no botão para autorizar e <strong>certifique-se de marcar a caixa de seleção de acesso aos arquivos</strong> na tela do Google.
                </p>
              </div>
            </div>
            <button
              onClick={handleConnectDrive}
              disabled={actionLoading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-2 shadow-sm"
            >
              {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <Cloud size={15} />}
              Autorizar Google Drive
            </button>
          </div>
        )}

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
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

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
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
      <div className="glass-panel p-5 shadow-none">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">Backup automático</h3>
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

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
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
        </div>
      </section>

      {/* Seção de Atualizações */}
      <div className="glass-panel p-5 max-w-6xl shadow-none">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <RefreshCw size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold">Atualizações</h3>
            <p className="text-text-muted mt-1 text-sm">
              Mantenha seu aplicativo na versão mais recente para receber novos recursos e correções.
              {appVersion && <span className="block mt-1">Versão atual: <strong className="text-white">v{appVersion}</strong></span>}
            </p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
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

      {/* Modal de PIN */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Lock size={18} className="text-accent" />
                {showPinModal === 'set'
                  ? (pinEnabled ? 'Alterar PIN' : 'Criar PIN')
                  : 'Desativar PIN'}
              </h3>
              <p className="text-sm text-text-muted mt-1">
                {showPinModal === 'set'
                  ? 'Digite um PIN numérico de 4 a 8 dígitos.'
                  : 'Digite o PIN atual para confirmar a desativação.'}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">
                  {showPinModal === 'disable' ? 'PIN atual' : 'Novo PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white text-center tracking-widest text-xl"
                  autoFocus
                />
              </div>
              {showPinModal === 'set' && (
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Confirmar PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="••••"
                    value={pinConfirm}
                    onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white text-center tracking-widest text-xl"
                  />
                </div>
              )}
              {pinError && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={12} /> {pinError}
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowPinModal(null); setPinInput(''); setPinConfirm(''); setPinError(''); }}
                disabled={pinLoading}
                className="px-4 py-2 text-text-muted hover:text-white transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={showPinModal === 'set' ? handleEnablePin : handleDisablePin}
                disabled={pinLoading}
                className={clsx(
                  'px-5 py-2 rounded-lg font-medium text-sm inline-flex items-center gap-2 disabled:opacity-50',
                  showPinModal === 'disable'
                    ? 'bg-rose-500/80 hover:bg-rose-500 text-white'
                    : 'bg-accent hover:bg-accent-hover text-white'
                )}
              >
                {pinLoading && <Loader2 size={15} className="animate-spin" />}
                {showPinModal === 'set' ? (pinEnabled ? 'Alterar' : 'Ativar') : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
