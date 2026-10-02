import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Clock, TrendingUp, TrendingDown, Users, CheckCircle2, X, ReceiptText, CreditCard, Loader2 } from 'lucide-react';
import ExpensesByCategoryChart from '../components/ExpensesByCategoryChart';

const formatCurrency = (value) => {
  const num = Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(isNaN(num) ? 0 : num);
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

export default function Dashboard({ userId, startDate, endDate }) {
  const [stats, setStats] = useState({
    depositRealized: 0,
    depositPending: 0,
    expensePaid: 0,
    expensePending: 0,
    balance: 0,
    netBalance: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [peopleData, setPeopleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState([]);
  const [categoryDetailsLoading, setCategoryDetailsLoading] = useState(false);

  const fetchStats = async () => {
    try {
      if (userId && startDate && endDate) {
        const result = await window.api.getDashboardStats(userId, startDate, endDate);
        if (result && typeof result === 'object' && !result.error) {
          setStats({
            depositRealized: Number(result.depositRealized) || 0,
            depositPending: Number(result.depositPending) || 0,
            expensePaid: Number(result.expensePaid) || 0,
            expensePending: Number(result.expensePending) || 0,
            balance: Number(result.balance) || 0,
            netBalance: Number(result.netBalance) || 0,
          });
        }
        const cats = await window.api.getCategoryExpenses(userId, startDate, endDate);
        if (Array.isArray(cats)) setCategoryData(cats);

        try {
          const ppl = await window.api.getPeopleExpenses(userId, startDate, endDate);
          if (Array.isArray(ppl)) setPeopleData(ppl);
        } catch (_) {
          setPeopleData([]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar stats do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedCategory(null);
    fetchStats();
  }, [userId, startDate, endDate]);

  useEffect(() => {
    if (!selectedCategory) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setSelectedCategory(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedCategory]);

  const openCategoryDetails = async (category) => {
    if (!category?.name || !userId || !startDate || !endDate) return;
    setSelectedCategory(category);
    setCategoryDetails([]);
    setCategoryDetailsLoading(true);
    try {
      const details = await window.api.getCategoryExpenseDetails(userId, startDate, endDate, category.name);
      setCategoryDetails(Array.isArray(details) ? details : []);
    } catch (error) {
      console.error('Erro ao carregar detalhes da categoria:', error);
      setCategoryDetails([]);
    } finally {
      setCategoryDetailsLoading(false);
    }
  };

  if (loading) {
    return <div className="text-text-muted">Carregando dados...</div>;
  }

  const totalPeople = peopleData.reduce((acc, p) => acc + p.total, 0);
  const projectedIsPositive = stats.netBalance >= 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold tracking-wide text-accent uppercase mb-1">Visão financeira</p>
        <h2 className="text-2xl font-bold">Resumo do mês</h2>
        <p className="text-sm text-text-muted mt-1">Acompanhe o que entrou, o que saiu e o saldo projetado.</p>
      </header>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card Saldo em Caixa */}
        <div className="glass-panel col-span-2 p-5 flex flex-col gap-3 shadow-none border border-white/8 bg-gradient-to-br from-accent/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-text-muted font-medium text-sm">Saldo disponível</h3>
              <p className="text-xs text-text-muted mt-1">Recebimentos realizados menos despesas pagas</p>
            </div>
            <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center"><Wallet size={20} /></span>
          </div>
          <p className="text-3xl font-bold tracking-tight truncate">{formatCurrency(stats?.balance)}</p>
        </div>

        {/* Card Saldo Previsto */}
        <div className={`glass-panel col-span-2 p-5 flex flex-col gap-3 border shadow-none ${
          projectedIsPositive
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-rose-500/30 bg-rose-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-text-muted font-medium text-sm">Saldo previsto</h3>
              <p className="text-xs text-text-muted mt-1">Inclui tudo o que ainda entra e sai neste mês</p>
            </div>
            {projectedIsPositive
              ? <span className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><TrendingUp size={20} /></span>
              : <span className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center"><TrendingDown size={20} /></span>
            }
          </div>
          <p className={`text-3xl font-bold tracking-tight truncate ${
            projectedIsPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(stats?.netBalance)}
          </p>
        </div>

        {/* Card Recebimentos Realizados */}
        <div className="glass-panel p-4 flex flex-col gap-2 rounded-2xl shadow-none border border-white/8">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Receb. Realizados</h3>
            <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate text-emerald-400">{formatCurrency(stats?.depositRealized)}</p>
          <p className="text-[11px] text-text-muted">já realizado</p>
        </div>

        {/* Card Recebimentos Previstos */}
        <div className="glass-panel p-4 flex flex-col gap-2 rounded-2xl shadow-none border border-white/8">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Receb. Previstos</h3>
            <ArrowUpCircle className="text-amber-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate text-amber-400">{formatCurrency(stats?.depositPending)}</p>
          <p className="text-[11px] text-text-muted">previsto no período</p>
        </div>

        {/* Card Despesas Pagas */}
        <div className="glass-panel p-4 flex flex-col gap-2 rounded-2xl shadow-none border border-white/8">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Desp. Pagas</h3>
            <ArrowDownCircle className="text-rose-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate text-rose-400">{formatCurrency(stats?.expensePaid)}</p>
          <p className="text-[11px] text-text-muted">despesas liquidadas</p>
        </div>

        {/* Card Despesas Pendentes */}
        <div className="glass-panel p-4 flex flex-col gap-2 rounded-2xl shadow-none border border-white/8">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Desp. Pendentes</h3>
            <Clock className="text-amber-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate text-amber-400">{formatCurrency(stats?.expensePending)}</p>
          <p className="text-[11px] text-text-muted">ainda a pagar</p>
        </div>
      </div>

      <section className="space-y-4">
      {/* Gráfico de Despesas por Categoria */}
      <div className="glass-panel p-5 shadow-none">
        <ExpensesByCategoryChart categoryData={categoryData} onCategorySelect={openCategoryDetails} />
      </div>

      {/* Widget Gastos por Pessoa */}
      {peopleData.length > 0 && (
        <div className="glass-panel p-5 shadow-none">
          <div className="flex items-start gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><Users size={16} /></span>
            <div>
              <h3 className="font-semibold text-sm">Gastos por pessoa</h3>
              <p className="text-xs text-text-muted mt-0.5">Total vinculado: <span className="text-rose-400 font-semibold">{formatCurrency(totalPeople)}</span></p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {peopleData.map((person) => {
              const pct = totalPeople > 0 ? (person.total / totalPeople) * 100 : 0;
              return (
                <div key={person.person_id} className="bg-white/5 rounded-xl p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: person.avatar_color }}
                    >
                      {getInitials(person.person_name)}
                    </div>
                    <span className="font-medium text-sm truncate flex-1">{person.person_name}</span>
                    <span className="text-rose-400 font-semibold text-sm whitespace-nowrap">{formatCurrency(person.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: person.avatar_color }}
                    />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1.5">{pct.toFixed(1)}% do total vinculado</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </section>

      {selectedCategory && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedCategory(null);
          }}
        >
          <div className="glass-panel w-full max-w-4xl max-h-[82vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${selectedCategory.color || '#94a3b8'}22`, color: selectedCategory.color || '#94a3b8' }}
                >
                  <ReceiptText size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Lançamentos da categoria</p>
                  <h3 className="text-lg font-bold truncate">{selectedCategory.name}</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {categoryDetails.length} {categoryDetails.length === 1 ? 'lançamento' : 'lançamentos'} · {formatCurrency(selectedCategory.value)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="w-9 h-9 rounded-lg text-text-muted hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Fechar detalhes da categoria"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-auto min-h-[180px]">
              {categoryDetailsLoading ? (
                <div className="h-48 flex flex-col items-center justify-center text-text-muted gap-3">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <p className="text-sm">Carregando lançamentos...</p>
                </div>
              ) : categoryDetails.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-text-muted">
                  Nenhum lançamento encontrado nesta categoria.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 bg-[#182337] z-10">
                    <tr className="text-[11px] uppercase tracking-wider text-text-muted border-b border-white/10">
                      <th className="px-5 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Origem</th>
                      <th className="px-4 py-3 font-medium">Pessoa</th>
                      <th className="px-5 py-3 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryDetails.map((item) => (
                      <tr key={`${item.source_type}-${item.id}`} className="border-b border-white/5 hover:bg-white/[0.025]">
                        <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
                          {String(item.date || '').split('-').reverse().join('/')}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{item.description}</p>
                          {Number(item.installments) > 1 && (
                            <p className="text-[11px] text-text-muted mt-0.5">Parcela {item.installment_number}/{item.installments}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                            {item.source_type === 'credit_card' ? <CreditCard size={13} /> : <Wallet size={13} />}
                            {item.source_type === 'credit_card' ? item.source_name : 'Conta'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">{item.person_name || '—'}</td>
                        <td className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${Number(item.amount) < 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
