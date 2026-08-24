import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (value) => {
  const num = Number(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(isNaN(num) ? 0 : num);
};

export default function Transactions({ userId, startDate, endDate }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ 
    description: '', 
    amount: '', 
    type: 'expense', 
    date: new Date().toISOString().split('T')[0], 
    category_id: '',
    is_fixed: false,
    is_paid: false
  });

  const fetchData = async () => {
    try {
      if (userId && startDate && endDate) {
        const txs = await window.api.getTransactions(userId, startDate, endDate);
        if (Array.isArray(txs)) {
          setTransactions(txs);
        }
        const cats = await window.api.getCategories(userId);
        if (Array.isArray(cats)) {
          setCategories(cats);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        user_id: userId,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        date: form.date,
        // If no category selected, store null (allows FK to be optional)
        category_id: form.category_id ? Number(form.category_id) : null,
        // Ensure boolean value for fixed flag
        is_fixed: !!form.is_fixed,
        is_paid: !!form.is_paid
      };

      if (editingId) {
      const result = await window.api.updateTransaction(editingId, payload);
    console.log('Update result:', result);
      } else {
        await window.api.addTransaction(payload);
      }
      
      closeModal();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (t) => {
    setForm({
      description: t.description,
      amount: t.amount,
      type: t.type,
      date: t.date,
      category_id: t.category_id,
      is_fixed: !!t.is_fixed,
      is_paid: !!t.is_paid
    });
    setEditingId(t.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ description: '', amount: '', type: 'expense', date: new Date().toISOString().split('T')[0], category_id: '', is_fixed: false, is_paid: false });
  };

  const confirmDelete = (id) => {
    setDeletingId(id);
  };

  const executeDelete = async () => {
    if (deletingId) {
      await window.api.deleteTransaction(deletingId);
      setDeletingId(null);
      fetchData();
    }
  };

  const togglePaidStatus = async (t) => {
    try {
      const payload = {
        ...t,
        is_paid: !t.is_paid
      };
      await window.api.updateTransaction(t.id, payload);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTransactions = (transactions || []).filter(t => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const descMatch = (t.description || '').toLowerCase().includes(search);
    const catMatch = (t.category_name || 'Geral').toLowerCase().includes(search);
    return descMatch || catMatch;
  });

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transações</h2>
          <p className="text-text-muted">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-accent w-64 transition-colors"
            />
          </div>
          <button 
              onClick={() => {
                setEditingId(null);
                setForm({ description: '', amount: '', type: 'expense', date: new Date().toISOString().split('T')[0], category_id: '', is_fixed: false });
                setShowModal(true);
              }} 
              className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
            >
            <Plus size={20} />
            Nova Transação
          </button>
        </div>
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
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-text-muted">Nenhuma transação encontrada.</td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">{(t.date && typeof t.date === 'string') ? t.date.split('-').reverse().join('/') : '-'}</td>
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
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        {t.type === 'expense' && (
                          <button onClick={() => togglePaidStatus(t)} className={clsx("p-2 rounded-lg transition-colors", t.is_paid ? "text-emerald-400 hover:bg-white/5" : "text-text-muted hover:text-emerald-400 hover:bg-white/5")} title={t.is_paid ? "Marcar como pendente" : "Marcar como pago"}>
                            {t.is_paid ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        )}
                        <button onClick={() => openEditModal(t)} className="p-2 text-text-muted hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button onClick={() => confirmDelete(t.id)} className="p-2 text-text-muted hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors" title="Excluir">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"/></svg>
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

      {/* Modal de Confirmação de Exclusão */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 relative overflow-hidden text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Excluir Transação</h2>
            <p className="text-text-muted mb-6">Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeletingId(null)} className="px-5 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors font-medium">Cancelar</button>
              <button onClick={executeDelete} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-lg font-medium transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Simples */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Transação' : 'Nova Transação'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              
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

              {form.type === 'expense' && (
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-white/10 rounded-lg bg-black/20 hover:bg-white/5 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-emerald-500"
                    checked={form.is_paid}
                    onChange={e => setForm({...form, is_paid: e.target.checked})}
                  />
                  <div>
                    <p className="font-medium">Despesa Paga</p>
                    <p className="text-xs text-text-muted">Marque se esta despesa já foi paga</p>
                  </div>
                </label>
              )}

              {!editingId && (
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
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={closeModal} className="px-5 py-2 rounded-lg text-text-muted hover:bg-white/5 transition-colors">Cancelar</button>
                <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium transition-colors">{editingId ? 'Atualizar' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
