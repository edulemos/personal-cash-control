import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import ExpensesByCategoryChart from '../components/ExpensesByCategoryChart';

const formatCurrency = (value) => {
  const num = Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(isNaN(num) ? 0 : num);
};

export default function Dashboard({ userId, startDate, endDate }) {
  const [stats, setStats] = useState({ income: 0, expensePaid: 0, expensePending: 0, balance: 0, netBalance: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      if (userId && startDate && endDate) {
        const result = await window.api.getDashboardStats(userId, startDate, endDate);
        if (result && typeof result === 'object' && !result.error) {
          setStats({
            income: Number(result.income) || 0,
            expensePaid: Number(result.expensePaid) || 0,
            expensePending: Number(result.expensePending) || 0,
            balance: Number(result.balance) || 0,
            netBalance: Number(result.netBalance) || 0
          });
        }
        const cats = await window.api.getCategoryExpenses(userId, startDate, endDate);
        if (Array.isArray(cats)) setCategoryData(cats);
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

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Resumo do Mês</h2>
        <p className="text-text-muted">Visão geral das suas finanças</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card Saldo Total */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Saldo Total</h3>
            <Wallet className="text-accent flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate">{formatCurrency(stats?.balance)}</p>
        </div>

        {/* Card Saldo Real */}
        <div className={`glass-panel p-4 flex flex-col gap-3 border col-span-2 lg:col-span-1 ${
          stats?.netBalance >= 0
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-rose-500/30 bg-rose-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Saldo Real</h3>
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
          <p className="text-xs text-text-muted -mt-1">Receitas − tudo a pagar</p>
        </div>

        {/* Card Receitas */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium text-sm">Receitas</h3>
            <ArrowUpCircle className="text-emerald-400 flex-shrink-0" size={20} />
          </div>
          <p className="text-xl font-bold truncate">{formatCurrency(stats?.income)}</p>
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
    </div>
  );
}
