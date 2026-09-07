import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CreditCard as CardIcon,
  CheckCircle2,
  Circle,
  CheckCheck,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import clsx from 'clsx';
import DescriptionAutocomplete from '../components/DescriptionAutocomplete';

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

const formatCurrency = (value) => {
  const num = Number(value);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
};

export default function CreditCards({ userId, globalMonth }) {
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [allCardsTotals, setAllCardsTotals] = useState({});
  
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reconciliationFilter, setReconciliationFilter] = useState('all'); // 'all' | 'pending' | 'checked'

  // Modals state
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);
  const [txError, setTxError] = useState('');

  const DEFAULT_CARD_FORM = { name: '', due_day: 10, closing_day: 3 };
  const [cardForm, setCardForm] = useState(DEFAULT_CARD_FORM);
  const [txForm, setTxForm] = useState({
    description: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', installments: 1, person_id: ''
  });

  const fetchData = async () => {
    try {
      if (!userId) return;
      const cardsList = await window.api.getCreditCards(userId);
      if (Array.isArray(cardsList)) {
        setCards(cardsList);
        if (cardsList.length > 0 && !selectedCardId) {
          setSelectedCardId(cardsList[0].id);
        }
      }
      const cats = await window.api.getCategories(userId);
      if (Array.isArray(cats)) setCategories(cats);
      const ppl = await window.api.getPeople(userId);
      if (Array.isArray(ppl)) setPeople(ppl);
    } catch (err) { console.error('Erro ao buscar cartões:', err); }
  };

  const fetchTransactions = async () => {
    if (!selectedCardId || !globalMonth) return;
    try {
      const txs = await window.api.getCreditCardTransactions(selectedCardId, globalMonth);
      if (Array.isArray(txs)) {
        setTransactions(txs);
      } else {
        setTransactions([]);
      }
    } catch (err) { console.error('Erro ao buscar transações do cartão:', err); }
  };

  const fetchAllCardsTotals = async () => {
    if (!globalMonth) return;
    try {
      const cardsList = await window.api.getCreditCards(userId);
      if (!Array.isArray(cardsList) || cardsList.length === 0) return;
      const results = await Promise.all(
        cardsList.map(async (c) => {
          try {
            const txs = await window.api.getCreditCardTransactions(c.id, globalMonth);
            const list = Array.isArray(txs) ? txs : [];
            const total = list.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
            const count = list.length;
            const checkedCount = list.filter(t => !!t.is_checked).length;
            const isFullyChecked = count > 0 && checkedCount === count;
            return { id: c.id, name: c.name, total, count, checkedCount, isFullyChecked };
          } catch {
            return { id: c.id, name: c.name, total: 0, count: 0, checkedCount: 0, isFullyChecked: false };
          }
        })
      );
      const totalsMap = {};
      results.forEach((r) => { totalsMap[r.id] = r; });
      setAllCardsTotals(totalsMap);
    } catch (err) { console.error('Erro ao buscar totais dos cartões:', err); }
  };

  useEffect(() => { fetchData(); }, [userId]);
  useEffect(() => { fetchTransactions(); }, [selectedCardId, globalMonth]);
  useEffect(() => { if (userId) fetchAllCardsTotals(); }, [cards, globalMonth]);

  const closeCardModal = () => {
    setShowCardModal(false);
    setCardForm({ name: '', due_day: 10, closing_day: 3 });
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    await window.api.addCreditCard({ ...cardForm, user_id: userId, due_day: Number(cardForm.due_day), closing_day: Number(cardForm.closing_day) });
    closeCardModal();
    fetchData();
  };

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    if (!txForm.category_id) {
      setTxError('Selecione uma categoria antes de lançar.');
      return;
    }
    setTxError('');
    const payload = {
      ...txForm,
      credit_card_id: selectedCardId,
      amount: Number(txForm.amount),
      installments: Number(txForm.installments),
      category_id: Number(txForm.category_id),
      person_id: txForm.person_id ? Number(txForm.person_id) : null
    };
    
    if (editingTxId) {
      await window.api.updateCreditCardTransaction(editingTxId, payload);
    } else {
      await window.api.addCreditCardTransaction(payload);
    }
    
    closeTxModal();
    fetchTransactions();
    fetchAllCardsTotals();
  };

  const openEditTx = (t) => {
    setTxForm({
      description: t.description,
      amount: t.amount,
      date: t.date,
      category_id: t.category_id || '',
      installments: t.installments,
      person_id: t.person_id || ''
    });
    setEditingTxId(t.id);
    setShowTxModal(true);
  };

  const closeTxModal = () => {
    setShowTxModal(false);
    setEditingTxId(null);
    setTxError('');
    setTxForm({
      description: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', installments: 1, person_id: ''
    });
  };

  const deleteCard = async (id) => {
    if (confirm('Excluir este cartão e todas as suas transações?')) {
      await window.api.deleteCreditCard(id);
      if (selectedCardId === id) setSelectedCardId(null);
      fetchData();
    }
  };

  const deleteTx = async (id) => {
    if (confirm('Excluir esta parcela/transação?')) {
      await window.api.deleteCreditCardTransaction(id);
      fetchTransactions();
      fetchAllCardsTotals();
    }
  };

  // Alternar status de conferência de um lançamento individual
  const handleToggleCheck = async (t) => {
    const nextVal = !t.is_checked;
    // Atualização otimista
    setTransactions(prev =>
      prev.map(item => item.id === t.id ? { ...item, is_checked: nextVal ? 1 : 0 } : item)
    );
    try {
      await window.api.toggleCreditCardTransactionCheck(t.id, nextVal);
      fetchAllCardsTotals();
    } catch (err) {
      console.error('Erro ao alternar conferência do lançamento:', err);
      fetchTransactions();
    }
  };

  // Conferir todos ou desmarcar todos
  const handleCheckAll = async (checked) => {
    if (!selectedCardId || !globalMonth || (transactions || []).length === 0) return;
    // Atualização otimista
    setTransactions(prev =>
      prev.map(item => ({ ...item, is_checked: checked ? 1 : 0 }))
    );
    try {
      await window.api.checkAllCreditCardTransactions(selectedCardId, globalMonth, checked);
      fetchAllCardsTotals();
    } catch (err) {
      console.error('Erro ao atualizar conferência em lote:', err);
      fetchTransactions();
    }
  };

  // Estatísticas de conciliação da fatura atual
  const reconciliationStats = useMemo(() => {
    const list = transactions || [];
    let totalAmount = 0;
    let checkedAmount = 0;
    let checkedCount = 0;

    for (const t of list) {
      const amt = Number(t.amount) || 0;
      totalAmount += amt;
      if (t.is_checked) {
        checkedAmount += amt;
        checkedCount++;
      }
    }

    const totalCount = list.length;
    const pendingCount = totalCount - checkedCount;
    const pendingAmount = Math.max(0, totalAmount - checkedAmount);
    const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
    const isFullyChecked = totalCount > 0 && checkedCount === totalCount;

    return {
      totalAmount,
      checkedAmount,
      pendingAmount,
      totalCount,
      checkedCount,
      pendingCount,
      percentage,
      isFullyChecked
    };
  }, [transactions]);

  // Filtragem de transações combinando pesquisa e status de conferência
  const filteredTransactions = (transactions || []).filter(t => {
    if (reconciliationFilter === 'pending' && t.is_checked) return false;
    if (reconciliationFilter === 'checked' && !t.is_checked) return false;

    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const descMatch = (t.description || '').toLowerCase().includes(search);
    const categoryName = (categories || []).find(c => c.id === t.category_id)?.name || 'Geral';
    const catMatch = categoryName.toLowerCase().includes(search);
    const personMatch = (t.person_name || '').toLowerCase().includes(search);
    return descMatch || catMatch || personMatch;
  });

  const grandTotal = Object.values(allCardsTotals).reduce((acc, c) => acc + c.total, 0);
  const cardCount = Object.values(allCardsTotals).filter((c) => c.total > 0).length;
  const currentCard = cards.find(c => c.id === selectedCardId);

  return (
    <div className="flex flex-col h-full gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Cartões de Crédito</h2>
          <p className="text-text-muted">Gerencie faturas, compras parceladas e conferência de lançamentos</p>
        </div>
        <button onClick={() => setShowCardModal(true)} className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-accent/20 transition-all">
          <Plus size={20} /> Novo Cartão
        </button>
      </header>

      {/* Totalizador geral de faturas */}
      {cards.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.06) 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '16px',
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CardIcon size={22} style={{ color: '#f87171' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '2px' }}>
                Total de Faturas &mdash;{' '}
                {globalMonth
                  ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
                      new Date(`${globalMonth}-02`)
                    )
                  : ''}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(248,113,113,0.7)' }}>
                {cardCount} {cardCount === 1 ? 'cartão com gasto' : 'cartões com gastos'} neste mês
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#f87171',
                letterSpacing: '-0.5px',
                lineHeight: 1,
              }}
            >
              {formatCurrency(grandTotal)}
            </div>
            {Object.values(allCardsTotals).length > 1 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {Object.values(allCardsTotals).map((c) => (
                  c.total > 0 && (
                    <span
                      key={c.id}
                      style={{
                        fontSize: '11px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '20px',
                        padding: '2px 10px',
                        color: '#fca5a5',
                      }}
                    >
                      {c.name}: {formatCurrency(c.total)}
                      {c.isFullyChecked && ' ✓'}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Lista de Cartões (Sidebar esquerdo) */}
        <div className="w-64 flex flex-col gap-2 overflow-y-auto">
          {cards.map(c => {
            const cardStats = allCardsTotals[c.id];
            const isSelected = selectedCardId === c.id;
            return (
              <div 
                key={c.id} 
                onClick={() => setSelectedCardId(c.id)}
                className={clsx(
                  "p-4 rounded-xl cursor-pointer transition-all border group relative",
                  isSelected ? "bg-accent/10 border-accent/40 shadow-sm" : "glass-panel border-white/5 hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <CardIcon className={isSelected ? "text-accent" : "text-text-muted"} size={20} />
                  <div className="flex-1 font-medium truncate">{c.name}</div>
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted mt-2">
                  <span>Vence dia {c.due_day} • Fecha {c.closing_day}</span>
                </div>

                {/* Badge de status da conferência na lista de cartões */}
                {cardStats && cardStats.count > 0 && (
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs font-semibold text-rose-300">
                      {formatCurrency(cardStats.total)}
                    </span>
                    {cardStats.isFullyChecked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCheck size={11} /> Conferida
                      </span>
                    ) : cardStats.checkedCount > 0 ? (
                      <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {cardStats.checkedCount}/{cardStats.count} conferidos
                      </span>
                    ) : (
                      <span className="text-[10px] text-text-muted">
                        {cardStats.count} {cardStats.count === 1 ? 'item' : 'itens'}
                      </span>
                    )}
                  </div>
                )}

                <button 
                  onClick={(e) => { e.stopPropagation(); deleteCard(c.id); }} 
                  className="absolute top-2 right-2 p-2 text-text-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir Cartão"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          {cards.length === 0 && <p className="text-sm text-text-muted text-center p-4">Nenhum cartão cadastrado</p>}
        </div>

        {/* Fatura do Cartão Selecionado */}
        {selectedCardId ? (
          <div className="flex-1 glass-panel overflow-hidden flex flex-col border border-white/10 rounded-2xl shadow-xl">
            {/* Header da Fatura com Resumo de Conferência */}
            <div className="p-6 border-b border-white/5 bg-black/20 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{currentCard?.name || 'Fatura'}</h3>
                    
                    {/* Badge de status geral da fatura */}
                    {reconciliationStats.totalCount === 0 ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-text-muted border border-white/10">
                        Sem lançamentos
                      </span>
                    ) : reconciliationStats.isFullyChecked ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                        <ShieldCheck size={14} className="text-emerald-400" /> Fatura 100% Conferida
                      </span>
                    ) : reconciliationStats.checkedCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        <CheckCheck size={14} className="text-amber-400" /> Em Conferência ({reconciliationStats.percentage}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-text-muted">
                        <Circle size={12} /> Pendente de Conferência
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-text-muted mt-1">
                    Vencimento: dia {currentCard?.due_day} • Fechamento: dia {currentCard?.closing_day}
                    {reconciliationStats.totalCount > 0 && (
                      <span className="ml-2 font-medium text-white/70">
                        ({reconciliationStats.checkedCount} de {reconciliationStats.totalCount} itens conferidos)
                      </span>
                    )}
                  </p>
                </div>

                {/* Bloco de Totais */}
                <div className="text-right">
                  <div className="text-xs text-text-muted mb-0.5">Total da Fatura</div>
                  <div className="text-3xl font-bold text-rose-400 tracking-tight">
                    {formatCurrency(reconciliationStats.totalAmount)}
                  </div>
                  {reconciliationStats.totalCount > 0 && (
                    <div className="flex items-center justify-end gap-3 mt-1.5 text-xs">
                      <span className="text-emerald-400 flex items-center gap-1" title="Valor já conferido com a fatura emitida">
                        <CheckCircle2 size={12} /> Conferido: <strong>{formatCurrency(reconciliationStats.checkedAmount)}</strong>
                      </span>
                      {reconciliationStats.pendingAmount > 0 && (
                        <span className="text-amber-300/90 flex items-center gap-1" title="Valor ainda pendente de conferência">
                          <Circle size={12} /> A conferir: <strong>{formatCurrency(reconciliationStats.pendingAmount)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Progresso da Conferência */}
              {reconciliationStats.totalCount > 0 && (
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5 relative">
                  <div 
                    className={clsx(
                      "h-full transition-all duration-500 rounded-full",
                      reconciliationStats.isFullyChecked
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-gradient-to-r from-amber-500 to-emerald-400"
                    )}
                    style={{ width: `${reconciliationStats.percentage}%` }}
                  />
                </div>
              )}
            </div>
            
            {/* Barra de Ferramentas / Filtros */}
            <div className="p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-3 bg-black/10">
              {/* Filtros de visualização por status de conferência */}
              <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setReconciliationFilter('all')}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    reconciliationFilter === 'all'
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-muted hover:text-white hover:bg-white/5"
                  )}
                >
                  Todos ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReconciliationFilter('pending')}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                    reconciliationFilter === 'pending'
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-text-muted hover:text-amber-200 hover:bg-white/5"
                  )}
                >
                  <Circle size={11} /> Pendentes ({reconciliationStats.pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReconciliationFilter('checked')}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                    reconciliationFilter === 'checked'
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-text-muted hover:text-emerald-200 hover:bg-white/5"
                  )}
                >
                  <CheckCircle2 size={11} /> Conferidos ({reconciliationStats.checkedCount})
                </button>
              </div>

              {/* Pesquisa e Ações Rápidas */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input 
                    type="text" 
                    placeholder="Pesquisar compra..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white outline-none focus:border-accent w-44 transition-colors"
                  />
                </div>

                {/* Botões de Ação em Lote de Conferência */}
                {transactions.length > 0 && (
                  <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                    {!reconciliationStats.isFullyChecked && (
                      <button
                        type="button"
                        onClick={() => handleCheckAll(true)}
                        title="Marcar todos os lançamentos desta fatura como conferidos"
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all font-medium"
                      >
                        <CheckCheck size={14} /> Conferir Tudo
                      </button>
                    )}
                    {reconciliationStats.checkedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCheckAll(false)}
                        title="Desmarcar todos os lançamentos conferidos desta fatura"
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-text-muted hover:text-white hover:bg-white/10 transition-all font-medium"
                      >
                        <RotateCcw size={13} /> Desmarcar
                      </button>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => {
                    setEditingTxId(null);
                    setTxForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', installments: 1, person_id: '' });
                    setShowTxModal(true);
                  }} 
                  className="bg-accent/15 border border-accent/30 text-accent hover:bg-accent hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <Plus size={15} /> Lançar Compra
                </button>
              </div>
            </div>

            {/* Tabela de Lançamentos da Fatura */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-white/5 bg-black/20 text-xs uppercase tracking-wider">
                    <th className="p-4 w-12 text-center" title="Marque para conferir o lançamento com o extrato da fatura">
                      Conf.
                    </th>
                    <th className="p-4 font-medium">Data Compra</th>
                    <th className="p-4 font-medium">Descrição</th>
                    <th className="p-4 font-medium">Categoria</th>
                    <th className="p-4 font-medium">Pessoa</th>
                    <th className="p-4 font-medium">Parcela</th>
                    <th className="p-4 font-medium text-right">Valor</th>
                    <th className="p-4 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-text-muted">
                        {transactions.length === 0
                          ? 'Nenhuma compra lançada nesta fatura.'
                          : 'Nenhum lançamento corresponde ao filtro ou pesquisa.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => {
                      const isChecked = !!t.is_checked;
                      return (
                        <tr 
                          key={t.id} 
                          className={clsx(
                            "border-b border-white/5 transition-colors group",
                            isChecked 
                              ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]" 
                              : "hover:bg-white/[0.02]"
                          )}
                        >
                          {/* Botão de Check de Conferência */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCheck(t)}
                              title={isChecked ? "Lançamento conferido com a fatura (clique para desmarcar)" : "Marcar lançamento como conferido com a fatura"}
                              className={clsx(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer mx-auto",
                                isChecked
                                  ? "text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                  : "text-white/25 hover:text-white/70 hover:bg-white/10 border border-white/10"
                              )}
                            >
                              {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </button>
                          </td>

                          <td className="p-4 text-text-muted text-xs whitespace-nowrap">
                            {t.date.split('-').reverse().join('/')}
                          </td>

                          <td className="p-4 font-medium">
                            <div className="flex items-center gap-2">
                              <span className={clsx(isChecked && "text-white/90")}>
                                {t.description}
                              </span>
                              {isChecked && (
                                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  Conferido
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 inline-block"
                              style={{ color: t.category_color || '#94a3b8' }}
                            >
                              {t.category_name || 'Geral'}
                            </span>
                          </td>

                          <td className="p-4">
                            {t.person_name ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ backgroundColor: t.person_avatar_color || '#6366f1' }}
                                >
                                  {getInitials(t.person_name)}
                                </div>
                                <span className="text-sm">{t.person_name}</span>
                              </div>
                            ) : (
                              <span className="text-text-muted text-sm">—</span>
                            )}
                          </td>

                          <td className="p-4 text-text-muted text-xs">
                            {t.installments > 1 ? `${t.installment_number}/${t.installments}` : 'À vista'}
                          </td>

                          <td className="p-4 text-right font-medium whitespace-nowrap">
                            <span className={clsx(isChecked ? "text-rose-300/80" : "text-rose-300 font-semibold")}>
                              {formatCurrency(t.amount)}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditTx(t)} className="p-1 text-text-muted hover:text-blue-400 transition-colors" title="Editar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                              </button>
                              <button onClick={() => deleteTx(t.id)} className="p-1 text-text-muted hover:text-rose-400 transition-colors" title="Excluir">
                                <Trash2 size={15}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 glass-panel flex items-center justify-center text-text-muted rounded-2xl">
            Selecione ou crie um cartão para ver a fatura
          </div>
        )}
      </div>

      {/* Modal Novo Cartão */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 border border-white/10 rounded-2xl shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Novo Cartão</h2>
            <form onSubmit={handleCardSubmit} className="space-y-4">
              <input type="text" placeholder="Nome do Cartão (ex: Nubank)" required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent" value={cardForm.name} onChange={e => setCardForm({...cardForm, name: e.target.value})} />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-text-muted mb-1 block">Dia de Vencimento</label>
                  <input type="number" min="1" max="31" required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent" value={cardForm.due_day} onChange={e => setCardForm({...cardForm, due_day: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-text-muted mb-1 block">Dia de Fechamento</label>
                  <input type="number" min="1" max="31" required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent" value={cardForm.closing_day} onChange={e => setCardForm({...cardForm, closing_day: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeCardModal} className="px-4 py-2 text-text-muted hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-hover transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lançamento */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 border border-white/10 rounded-2xl shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{editingTxId ? 'Editar Compra' : 'Nova Compra'}</h2>
            <form onSubmit={handleTxSubmit} className="space-y-4">
              <DescriptionAutocomplete
                userId={userId}
                value={txForm.description}
                onChange={(val) => setTxForm({...txForm, description: val})}
                placeholder="Descrição"
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white"
              />
              <div className="flex gap-4">
                <input type="number" step="0.01" placeholder="Valor Total (R$)" required className="flex-[2] bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} />
                <input type="number" min="1" max="48" placeholder="Parcelas" required disabled={!!editingTxId} className="flex-1 bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white disabled:opacity-50" title="Número de Parcelas" value={txForm.installments} onChange={e => setTxForm({...txForm, installments: e.target.value})} />
              </div>
              <input type="date" required disabled={!!editingTxId} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white disabled:opacity-50" title="Data da Compra" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} />
              <select
                className={`w-full bg-black/30 border rounded-lg p-3 outline-none focus:border-accent text-white transition-colors ${txError ? 'border-rose-500' : 'border-white/10'}`}
                value={txForm.category_id}
                onChange={e => { setTxForm({...txForm, category_id: e.target.value}); setTxError(''); }}
              >
                <option value="">Categoria</option>
                {categories.filter(c => c.type === 'expense').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {txError && <p className="text-xs text-rose-400 -mt-2">{txError}</p>}
              <select
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white"
                value={txForm.person_id}
                onChange={e => setTxForm({...txForm, person_id: e.target.value})}
              >
                <option value="">Pessoa (opcional)</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {editingTxId && <p className="text-xs text-amber-500/80">⚠️ Apenas a data e o número de parcelas não podem ser alterados. Descrição, valor, categoria e pessoa podem ser editados normalmente.</p>}
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeTxModal} className="px-4 py-2 text-text-muted hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg font-medium hover:bg-accent-hover transition-colors">{editingTxId ? 'Salvar' : 'Lançar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
