import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Building2, Pencil, X } from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (value) => {
  const num = Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(isNaN(num) ? 0 : num);
};

const BANK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#a855f7', '#14b8a6'
];

const BANK_ICONS = ['🏦', '💳', '💰', '🪙', '💵', '🏧', '📈', '🌟'];

export default function Receivables({ userId, startDate, endDate }) {
  const [deposits, setDeposits] = useState([]);
  const [banks, setBanks] = useState([]);
  const [tab, setTab] = useState('deposits'); // 'deposits' | 'banks'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all'|'pending'|'realized'

  // Modal depósito
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [editingDepositId, setEditingDepositId] = useState(null);
  const [depositForm, setDepositForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    bank_id: '',
    status: 'pending',
    is_fixed: false,
  });

  // Modal banco
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBankId, setEditingBankId] = useState(null);
  const [bankForm, setBankForm] = useState({ name: '', color: '#6366f1', icon: '🏦' });

  // Confirmação de exclusão
  const [deletingDepositId, setDeletingDepositId] = useState(null);
  const [deletingBankId, setDeletingBankId] = useState(null);

  const fetchData = async () => {
    try {
      if (userId && startDate && endDate) {
        const deps = await window.api.getDeposits(userId, startDate, endDate);
        if (Array.isArray(deps)) setDeposits(deps);
        const bks = await window.api.getBanks(userId);
        if (Array.isArray(bks)) setBanks(bks);
      }
    } catch (err) {
      console.error('Erro ao buscar recebimentos:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, startDate, endDate]);

  // ── DEPÓSITOS ──────────────────────────────────────────────
  const openNewDeposit = () => {
    setEditingDepositId(null);
    setDepositForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      bank_id: '',
      status: 'pending',
      is_fixed: false,
    });
    setShowDepositModal(true);
  };

  const openEditDeposit = (d) => {
    setEditingDepositId(d.id);
    setDepositForm({
      description: d.description,
      amount: d.amount,
      date: d.date,
      bank_id: d.bank_id || '',
      status: d.status,
      is_fixed: !!d.is_fixed,
    });
    setShowDepositModal(true);
  };

  const closeDepositModal = () => {
    setShowDepositModal(false);
    setEditingDepositId(null);
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        user_id: userId,
        bank_id: depositForm.bank_id ? Number(depositForm.bank_id) : null,
        description: depositForm.description,
        amount: Number(depositForm.amount),
        date: depositForm.date,
        status: depositForm.status,
        is_fixed: !!depositForm.is_fixed,
      };
      if (editingDepositId) {
        await window.api.updateDeposit(editingDepositId, payload);
      } else {
        await window.api.addDeposit(payload);
      }
      closeDepositModal();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDepositStatus = async (d) => {
    try {
      await window.api.toggleDepositStatus(d.id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteDeposit = async () => {
    if (deletingDepositId) {
      await window.api.deleteDeposit(deletingDepositId);
      setDeletingDepositId(null);
      fetchData();
    }
  };

  // ── BANCOS ──────────────────────────────────────────────────
  const openNewBank = () => {
    setEditingBankId(null);
    setBankForm({ name: '', color: '#6366f1', icon: '🏦' });
    setShowBankModal(true);
  };

  const openEditBank = (b) => {
    setEditingBankId(b.id);
    setBankForm({ name: b.name, color: b.color, icon: b.icon || '🏦' });
    setShowBankModal(true);
  };

  const closeBankModal = () => {
    setShowBankModal(false);
    setEditingBankId(null);
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { user_id: userId, ...bankForm };
      if (editingBankId) {
        await window.api.updateBank(editingBankId, bankForm);
      } else {
        await window.api.addBank(payload);
      }
      closeBankModal();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const executeDeleteBank = async () => {
    if (deletingBankId) {
      await window.api.deleteBank(deletingBankId);
      setDeletingBankId(null);
      fetchData();
    }
  };

  // ── FILTROS ─────────────────────────────────────────────────
  const filteredDeposits = deposits.filter(d => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!(d.description || '').toLowerCase().includes(s) &&
          !(d.bank_name || '').toLowerCase().includes(s)) return false;
    }
    if (statusFilter === 'pending') return d.status === 'pending';
    if (statusFilter === 'realized') return d.status === 'realized';
    return true;
  });

  // ── TOTAIS ──────────────────────────────────────────────────
  const totalRealized = deposits.filter(d => d.status === 'realized').reduce((s, d) => s + Number(d.amount), 0);
  const totalPending = deposits.filter(d => d.status === 'pending').reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recebimentos</h2>
          <p className="text-text-muted">Gerencie depósitos previstos e realizados</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary pills */}
          <div className="flex gap-3 mr-2">
            <div className="glass-panel px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              <span className="text-xs text-text-muted">Realizados</span>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalRealized)}</span>
            </div>
            <div className="glass-panel px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              <span className="text-xs text-text-muted">Previstos</span>
              <span className="text-sm font-bold text-amber-400">{formatCurrency(totalPending)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        <button
          onClick={() => setTab('deposits')}
          className={clsx(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'deposits' ? 'bg-accent text-white shadow' : 'text-text-muted hover:text-white'
          )}
        >
          Depósitos
        </button>
        <button
          onClick={() => setTab('banks')}
          className={clsx(
            'px-5 py-2 rounded-lg text-sm font-medium transition-all',
            tab === 'banks' ? 'bg-accent text-white shadow' : 'text-text-muted hover:text-white'
          )}
        >
          Bancos / Contas
        </button>
      </div>

      {/* ──── TAB: DEPÓSITOS ──── */}
      {tab === 'deposits' && (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-accent transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent transition-colors cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="pending">Previstos</option>
              <option value="realized">Realizados</option>
            </select>
            <button
              onClick={openNewDeposit}
              className="ml-auto bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Novo Depósito
            </button>
          </div>

          <div className="glass-panel flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto p-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-text-muted border-b border-white/5">
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Descrição</th>
                    <th className="p-4 font-medium">Banco / Conta</th>
                    <th className="p-4 font-medium text-right">Valor</th>
                    <th className="p-4 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeposits.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-text-muted">
                        Nenhum depósito encontrado para este período.
                      </td>
                    </tr>
                  ) : (
                    filteredDeposits.map((d) => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => toggleDepositStatus(d)}
                            title={d.status === 'realized' ? 'Marcar como previsto' : 'Marcar como realizado'}
                            className="flex items-center gap-2 group"
                          >
                            {d.status === 'realized' ? (
                              <>
                                <CheckCircle2 size={18} className="text-emerald-400" />
                                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Realizado</span>
                              </>
                            ) : (
                              <>
                                <Circle size={18} className="text-amber-400" />
                                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Previsto</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-sm">
                          {(d.date && typeof d.date === 'string') ? d.date.split('-').reverse().join('/') : '-'}
                        </td>
                        <td className="p-4 font-medium flex items-center gap-2">
                          {d.description}
                          {d.is_fixed ? (
                            <span title="Recebimento Fixo" className="text-accent bg-accent/10 p-1 rounded">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            </span>
                          ) : null}
                        </td>
                        <td className="p-4">
                          {d.bank_name ? (
                            <span
                              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit"
                              style={{ backgroundColor: `${d.bank_color}20`, color: d.bank_color }}
                            >
                              {d.bank_icon && <span>{d.bank_icon}</span>}
                              {d.bank_name}
                            </span>
                          ) : (
                            <span className="text-text-muted text-sm">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-400">
                          +{formatCurrency(d.amount)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openEditDeposit(d)}
                              className="p-2 text-text-muted hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingDepositId(d.id)}
                              className="p-2 text-text-muted hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ──── TAB: BANCOS ──── */}
      {tab === 'banks' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={openNewBank}
              className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Novo Banco / Conta
            </button>
          </div>

          {banks.length === 0 ? (
            <div className="glass-panel p-12 text-center text-text-muted">
              <Building2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum banco cadastrado ainda.</p>
              <p className="text-sm mt-1">Cadastre bancos ou contas para associar aos depósitos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {banks.map((b) => (
                <div
                  key={b.id}
                  className="glass-panel p-5 flex flex-col gap-3 relative group"
                  style={{ borderLeft: `3px solid ${b.color}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${b.color}20` }}
                    >
                      {b.icon || '🏦'}
                    </div>
                    <span className="font-semibold truncate">{b.name}</span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditBank(b)}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      onClick={() => setDeletingBankId(b.id)}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={13} /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ Modal Depósito ══ */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 relative">
            <button
              onClick={closeDepositModal}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6">
              {editingDepositId ? 'Editar Depósito' : 'Novo Depósito'}
            </h2>
            <form onSubmit={handleDepositSubmit} className="space-y-4">

              {/* Status */}
              <div className="flex gap-3 mb-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    className="peer sr-only"
                    checked={depositForm.status === 'pending'}
                    onChange={() => setDepositForm({ ...depositForm, status: 'pending' })}
                  />
                  <div className="text-center p-3 rounded-lg border border-white/10 peer-checked:border-amber-500 peer-checked:bg-amber-500/10 peer-checked:text-amber-400 transition-all text-sm font-medium">
                    Previsto
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    className="peer sr-only"
                    checked={depositForm.status === 'realized'}
                    onChange={() => setDepositForm({ ...depositForm, status: 'realized' })}
                  />
                  <div className="text-center p-3 rounded-lg border border-white/10 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 peer-checked:text-emerald-400 transition-all text-sm font-medium">
                    Realizado
                  </div>
                </label>
              </div>

              <input
                type="text"
                placeholder="Descrição"
                required
                className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent"
                value={depositForm.description}
                onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Valor (R$)"
                required
                className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent"
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
              />
              <input
                type="date"
                required
                className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent"
                value={depositForm.date}
                onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
              />
              <select
                className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent"
                value={depositForm.bank_id}
                onChange={(e) => setDepositForm({ ...depositForm, bank_id: e.target.value })}
              >
                <option value="">Banco / Conta (opcional)</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.icon} {b.name}</option>
                ))}
              </select>

              {!editingDepositId && (
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-white/10 rounded-lg bg-black/20 hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-accent"
                    checked={depositForm.is_fixed}
                    onChange={(e) => setDepositForm({ ...depositForm, is_fixed: e.target.checked })}
                  />
                  <div>
                    <p className="font-medium">Recebimento Fixo</p>
                    <p className="text-xs text-text-muted">Repetirá automaticamente por 12 meses</p>
                  </div>
                </label>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeDepositModal}
                  className="px-5 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingDepositId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Modal Banco ══ */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 relative">
            <button
              onClick={closeBankModal}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6">
              {editingBankId ? 'Editar Banco' : 'Novo Banco / Conta'}
            </h2>
            <form onSubmit={handleBankSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome do banco ou conta"
                required
                className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent"
                value={bankForm.name}
                onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              />

              <div>
                <p className="text-xs text-text-muted mb-2">Ícone</p>
                <div className="flex gap-2 flex-wrap">
                  {BANK_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setBankForm({ ...bankForm, icon })}
                      className={clsx(
                        'w-10 h-10 rounded-lg text-xl transition-all',
                        bankForm.icon === icon
                          ? 'bg-accent/20 ring-2 ring-accent'
                          : 'bg-white/5 hover:bg-white/10'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-text-muted mb-2">Cor</p>
                <div className="flex gap-2 flex-wrap">
                  {BANK_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBankForm({ ...bankForm, color })}
                      className={clsx(
                        'w-8 h-8 rounded-full transition-all',
                        bankForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-card scale-110' : ''
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeBankModal}
                  className="px-5 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingBankId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Confirmar exclusão de depósito ══ */}
      {deletingDepositId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Excluir Depósito</h2>
            <p className="text-text-muted mb-6">Tem certeza que deseja excluir este depósito? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeletingDepositId(null)} className="px-5 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors font-medium">Cancelar</button>
              <button onClick={executeDeleteDeposit} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-lg font-medium transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Confirmar exclusão de banco ══ */}
      {deletingBankId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Remover Banco</h2>
            <p className="text-text-muted mb-6">O banco será removido. Os depósitos associados a ele não serão excluídos, apenas perderão o vínculo com o banco.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeletingBankId(null)} className="px-5 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors font-medium">Cancelar</button>
              <button onClick={executeDeleteBank} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-lg font-medium transition-colors">Sim, Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
