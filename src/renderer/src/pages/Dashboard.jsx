import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function Dashboard({ userId, startDate, endDate }) {
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const result = await window.api.getDashboardStats(userId, startDate, endDate);
      setStats(result);
    } catch (error) {
      console.error(error);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Saldo */}
        <div className="glass-panel p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium">Saldo Total</h3>
            <Wallet className="text-accent" size={24} />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats.balance)}</p>
        </div>

        {/* Card Receitas */}
        <div className="glass-panel p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium">Receitas</h3>
            <ArrowUpCircle className="text-emerald-400" size={24} />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats.income)}</p>
        </div>

        {/* Card Despesas */}
        <div className="glass-panel p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-text-muted font-medium">Despesas</h3>
            <ArrowDownCircle className="text-rose-400" size={24} />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats.expense)}</p>
        </div>
      </div>

      {/* Espaço para Gráficos Futuros */}
      <div className="glass-panel p-6 min-h-[300px] flex items-center justify-center">
        <p className="text-text-muted">Área reservada para gráficos (Recharts / Chart.js)</p>
      </div>
    </div>
  );
}
