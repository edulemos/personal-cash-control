import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Clock, TrendingUp, TrendingDown, Users, CheckCircle2 } from 'lucide-react';
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
    fetchStats();
  }, [userId, startDate, endDate]);

  if (loading) {
    return <div className="text-text-muted">Carregando dados...</div>;
  }

  const totalPeople = peopleData.reduce((acc, p) => acc + p.total, 0);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Resumo do Mês</h2>
        <p className="text-text-muted">Visão geral das suas finanças</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Card Saldo em Caixa */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Saldo em Caixa</h3>
            <Wallet className="text-accent flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate">{formatCurrency(stats?.balance)}</p>
          <p className="text-xs text-text-muted -mt-1">Realizados − Desp. pagas</p>
        </div>

        {/* Card Saldo Previsto */}
        <div className={`glass-panel p-4 flex flex-col gap-3 border col-span-2 lg:col-span-1 ${
          stats?.netBalance >= 0
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-rose-500/30 bg-rose-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Saldo Previsto</h3>
            {stats?.netBalance >= 0
              ? <TrendingUp className="text-emerald-400 flex-shrink-0" size={20} />
              : <TrendingDown className="text-rose-400 flex-shrink-0" size={20} />
            }
          </div>
          <p className={`text-xl font-bold truncate ${
            stats?.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(stats?.netBalance)}
          </p>
          <p className="text-xs text-text-muted -mt-1">Todos receb. − tudo a pagar</p>
        </div>

        {/* Card Recebimentos Realizados */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Receb. Realizados</h3>
            <CheckCircle2 className="text-emerald-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate text-emerald-400">{formatCurrency(stats?.depositRealized)}</p>
        </div>

        {/* Card Recebimentos Previstos */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Receb. Previstos</h3>
            <ArrowUpCircle className="text-amber-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate text-amber-400">{formatCurrency(stats?.depositPending)}</p>
        </div>

        {/* Card Despesas Pagas */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Desp. Pagas</h3>
            <ArrowDownCircle className="text-rose-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate">{formatCurrency(stats?.expensePaid)}</p>
        </div>

        {/* Card Despesas Pendentes */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Desp. Pendentes</h3>
            <Clock className="text-amber-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate">{formatCurrency(stats?.expensePending)}</p>
        </div>
      </div>

      {/* Gráfico de Despesas por Categoria */}
      <div className="glass-panel p-6 min-h-[300px]">
        <ExpensesByCategoryChart categoryData={categoryData} />
      </div>

      {/* Widget Gastos por Pessoa */}
      {peopleData.length > 0 && (
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-accent" />
            <h3 className="font-semibold">Gastos por Pessoa</h3>
            <span className="ml-auto text-xs text-text-muted">Total vinculado: <span className="text-rose-400 font-semibold">{formatCurrency(totalPeople)}</span></span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {peopleData.map((person) => {
              const pct = totalPeople > 0 ? (person.total / totalPeople) * 100 : 0;
              return (
                <div key={person.person_id} className="flex-shrink-0 min-w-[160px] bg-white/5 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: person.avatar_color }}
                    >
                      {getInitials(person.person_name)}
                    </div>
                    <span className="font-medium text-sm truncate">{person.person_name}</span>
                  </div>
                  <p className="text-rose-400 font-bold text-base">{formatCurrency(person.total)}</p>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: person.avatar_color }}
                    />
                  </div>
                  <p className="text-xs text-text-muted">{pct.toFixed(1)}% do total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
