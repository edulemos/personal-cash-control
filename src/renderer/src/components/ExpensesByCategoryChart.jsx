import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const FALLBACK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    isNaN(Number(value)) ? 0 : Number(value)
  );

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, color } = payload[0].payload;
  return (
    <div className="bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="font-medium text-white">{name}</span>
      </div>
      <span className="text-text-muted">{formatCurrency(value)}</span>
    </div>
  );
};

// categoryData: array de { name, value, color } já agregado pelo backend
export default function ExpensesByCategoryChart({ categoryData }) {
  // Garante cores para entradas sem cor cadastrada
  const data = useMemo(() => {
    if (!Array.isArray(categoryData) || categoryData.length === 0) return [];
    return categoryData.map((d, i) => ({
      ...d,
      color: d.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }));
  }, [categoryData]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[260px]">
        <p className="text-text-muted text-sm">Nenhuma despesa no período.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h3 className="text-lg font-semibold">Despesas por Categoria</h3>
        <p className="text-text-muted text-sm">Distribuição dos gastos no período (inclui sub-categorias do cartão)</p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6 flex-1 min-h-0">
        {/* Gráfico de pizza */}
        <div className="relative flex-shrink-0 w-[180px] h-[180px] md:w-[220px] md:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={84}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Texto central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-text-muted">Total</span>
            <span className="text-base font-bold text-white leading-tight">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Lista de categorias */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3 w-full overflow-auto max-h-[240px] pr-1">
          {data.map((entry) => {
            const pct = total > 0 ? (entry.value / total) * 100 : 0;
            return (
              <div key={entry.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: entry.color }}
                    />
                    <span className="truncate text-white font-medium">{entry.name}</span>
                  </div>
                  <span className="text-text-muted flex-shrink-0 ml-2">
                    {pct.toFixed(1)}%
                  </span>
                </div>
                {/* Barra de progresso */}
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: entry.color }}
                  />
                </div>
                <span className="text-xs text-text-muted">{formatCurrency(entry.value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
