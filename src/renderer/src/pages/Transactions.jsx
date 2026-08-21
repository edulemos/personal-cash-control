import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function Transactions({ userId, startDate, endDate }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ 
    description: '', 
    amount: '', 
    type: 'expense', 
    date: new Date().toISOString().split('T')[0], 
    category_id: '',
    is_fixed: false
  });

  const fetchData = async () => {
    try {
      const txs = await window.api.getTransactions(userId, startDate, endDate);
      setTransactions(txs);
      const cats = await window.api.getCategories(userId);
      setCategories(cats);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await window.api.addTransaction({
        user_id: userId,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        date: form.date,
        category_id: Number(form.category_id),
        is_fixed: form.is_fixed
      });
      setShowModal(false);
      setForm({ description: '', amount: '', type: 'expense', date: new Date().toISOString().split('T')[0], category_id: '', is_fixed: false });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await window.api.deleteTransaction(id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transações</h2>
          <p className="text-text-muted">Gerencie suas receitas e despesas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus size={20} />
          Nova Transação
        </button>
      </header>

      <div className="glass-panel flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto p-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-text-muted border-b border-white/5">
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Categoria</th>
                <th className="p-4 font-medium text-right">Valor</th>
                <th className="p-4 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-text-muted">Nenhuma transação encontrada neste mês.</td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 font-medium flex items-center gap-2">
                      {t.description}
                      {t.is_fixed ? (
                        <span title="Despesa Fixa" className="text-accent bg-accent/10 p-1 rounded">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10" style={{ color: t.category_color }}>
                        {t.category_name || 'Geral'}
                      </span>
                    </td>
                    <td className={clsx("p-4 text-right font-medium", t.type === 'income' ? 'text-emerald-400' : 'text-rose-400')}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDelete(t.id)} className="text-text-muted hover:text-rose-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Simples */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Nova Transação</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="flex gap-4 mb-2">
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="type" className="peer sr-only" checked={form.type === 'expense'} onChange={() => setForm({...form, type: 'expense'})} />
                  <div className="text-center p-3 rounded-lg border border-white/10 peer-checked:border-rose-500 peer-checked:bg-rose-500/10 peer-checked:text-rose-400 transition-all">Despesa</div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="type" className="peer sr-only" checked={form.type === 'income'} onChange={() => setForm({...form, type: 'income'})} />
                  <div className="text-center p-3 rounded-lg border border-white/10 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/10 peer-checked:text-emerald-400 transition-all">Receita</div>
                </label>
              </div>

              <input type="text" placeholder="Descrição" required className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <input type="number" step="0.01" placeholder="Valor (R$)" required className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              <input type="date" required className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              
              <select required className="w-full bg-bg-main border border-white/10 rounded-lg p-3 text-white outline-none focus:border-accent" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                <option value="" disabled>Selecione uma Categoria</option>
                {categories.filter(c => c.type === form.type).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-white/10 rounded-lg bg-black/20 hover:bg-white/5 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-accent"
                  checked={form.is_fixed}
                  onChange={e => setForm({...form, is_fixed: e.target.checked})}
                />
                <div>
                  <p className="font-medium">Lançamento Fixo</p>
                  <p className="text-xs text-text-muted">Repetirá automaticamente por 12 meses</p>
                </div>
              </label>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
