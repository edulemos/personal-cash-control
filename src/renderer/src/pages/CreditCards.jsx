import React, { useEffect, useState } from 'react';
import { Plus, Trash2, CreditCard as CardIcon } from 'lucide-react';
import clsx from 'clsx';

const formatCurrency = (value) => {
  const num = Number(value);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
};

export default function CreditCards({ userId, globalMonth }) {
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);

  const [cardForm, setCardForm] = useState({ name: '', due_day: 10, closing_day: 3 });
  const [txForm, setTxForm] = useState({
    description: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', installments: 1
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
      if (Array.isArray(cats)) {
        setCategories(cats);
      }
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

  useEffect(() => { fetchData(); }, [userId]);
  useEffect(() => { fetchTransactions(); }, [selectedCardId, globalMonth]);

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    await window.api.addCreditCard({ ...cardForm, user_id: userId, due_day: Number(cardForm.due_day), closing_day: Number(cardForm.closing_day) });
    setShowCardModal(false);
    fetchData();
  };

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...txForm,
      credit_card_id: selectedCardId,
      amount: Number(txForm.amount),
      installments: Number(txForm.installments),
      category_id: txForm.category_id ? Number(txForm.category_id) : null
    };
    
    if (editingTxId) {
      await window.api.updateCreditCardTransaction(editingTxId, payload);
    } else {
      await window.api.addCreditCardTransaction(payload);
    }
    
    closeTxModal();
    fetchTransactions();
  };

  const openEditTx = (t) => {
    setTxForm({
      description: t.description,
      amount: t.amount,
      date: t.date,
      category_id: t.category_id || '',
      installments: t.installments
    });
    setEditingTxId(t.id);
    setShowTxModal(true);
  };

  const closeTxModal = () => {
    setShowTxModal(false);
    setEditingTxId(null);
    setTxForm({
      description: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', installments: 1
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
    }
  };

  const totalInvoice = (transactions || []).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const filteredTransactions = (transactions || []).filter(t => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const descMatch = (t.description || '').toLowerCase().includes(search);
    const categoryName = (categories || []).find(c => c.id === t.category_id)?.name || 'Geral';
    const catMatch = categoryName.toLowerCase().includes(search);
    return descMatch || catMatch;
  });

  return (
    <div className="flex flex-col h-full gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Cartões de Crédito</h2>
          <p className="text-text-muted">Gerencie faturas e compras parceladas</p>
        </div>
        <button onClick={() => setShowCardModal(true)} className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2">
          <Plus size={20} /> Novo Cartão
        </button>
      </header>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Lista de Cartões (Sidebar esquerdo) */}
        <div className="w-64 flex flex-col gap-2">
          {cards.map(c => (
            <div 
              key={c.id} 
              onClick={() => setSelectedCardId(c.id)}
              className={clsx(
                "p-4 rounded-xl cursor-pointer transition-all border group relative",
                selectedCardId === c.id ? "bg-accent/10 border-accent/30" : "glass-panel border-white/5 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <CardIcon className={selectedCardId === c.id ? "text-accent" : "text-text-muted"} size={20} />
                <div className="flex-1 font-medium">{c.name}</div>
              </div>
              <div className="text-xs text-text-muted mt-2">Vence dia {c.due_day} • Fecha dia {c.closing_day}</div>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteCard(c.id); }} 
                className="absolute top-2 right-2 p-2 text-text-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {cards.length === 0 && <p className="text-sm text-text-muted text-center p-4">Nenhum cartão cadastrado</p>}
        </div>

        {/* Fatura do Cartão Selecionado */}
        {selectedCardId ? (
          <div className="flex-1 glass-panel overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/10">
              <div>
                <h3 className="text-xl font-bold">Fatura de {cards.find(c => c.id === selectedCardId)?.name}</h3>
              </div>
              <div className="text-right">
                <div className="text-sm text-text-muted mb-1">Total da Fatura</div>
                <div className="text-3xl font-bold text-rose-400">{formatCurrency(totalInvoice)}</div>
              </div>
            </div>
            
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <span className="font-medium">Lançamentos</span>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-sm text-white outline-none focus:border-accent w-48 transition-colors"
                  />
                </div>
                <button 
                  onClick={() => {
                    setEditingTxId(null);
                    setTxForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category_id: '', installments: 1 });
                    setShowTxModal(true);
                  }} 
                  className="text-accent hover:text-accent-hover text-sm font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> Lançar Compra
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-white/5 bg-black/20">
                    <th className="p-4 font-medium">Data Compra</th>
                    <th className="p-4 font-medium">Descrição</th>
                    <th className="p-4 font-medium">Parcela</th>
                    <th className="p-4 font-medium text-right">Valor</th>
                    <th className="p-4 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-text-muted">Nenhuma transação encontrada.</td></tr>
                  ) : (
                    filteredTransactions.map(t => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4">{t.date.split('-').reverse().join('/')}</td>
                        <td className="p-4 font-medium">{t.description}</td>
                        <td className="p-4">{t.installments > 1 ? `${t.installment_number}/${t.installments}` : 'À vista'}</td>
                        <td className="p-4 text-right text-rose-300 font-medium">{formatCurrency(t.amount)}</td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEditTx(t)} className="p-1 text-text-muted hover:text-blue-400 transition-colors" title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button onClick={() => deleteTx(t.id)} className="p-1 text-text-muted hover:text-rose-400 transition-colors" title="Excluir">
                              <Trash2 size={16}/>
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
        ) : (
          <div className="flex-1 glass-panel flex items-center justify-center text-text-muted">
            Selecione ou crie um cartão para ver a fatura
          </div>
        )}
      </div>

      {/* Modal Novo Cartão */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6">
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
                <button type="button" onClick={() => setShowCardModal(false)} className="px-4 py-2 text-text-muted">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg font-medium">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lançamento */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingTxId ? 'Editar Compra' : 'Nova Compra'}</h2>
            <form onSubmit={handleTxSubmit} className="space-y-4">
              <input type="text" placeholder="Descrição" required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} />
              <div className="flex gap-4">
                <input type="number" step="0.01" placeholder="Valor Total (R$)" required className="flex-[2] bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} />
                <input type="number" min="1" max="48" placeholder="Parcelas" required disabled={!!editingTxId} className="flex-1 bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white disabled:opacity-50" title="Número de Parcelas" value={txForm.installments} onChange={e => setTxForm({...txForm, installments: e.target.value})} />
              </div>
              <input type="date" required disabled={!!editingTxId} className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white disabled:opacity-50" title="Data da Compra" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} />
              <select required className="w-full bg-black/30 border border-white/10 rounded-lg p-3 outline-none focus:border-accent text-white" value={txForm.category_id} onChange={e => setTxForm({...txForm, category_id: e.target.value})}>
                <option value="" disabled>Categoria</option>
                {categories.filter(c => c.type === 'expense').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {editingTxId && <p className="text-xs text-amber-500/80">Nota: Não é possível editar a data nem as parcelas de um lançamento já realizado para não alterar faturas passadas.</p>}
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeTxModal} className="px-4 py-2 text-text-muted">Cancelar</button>
                <button type="submit" className="bg-accent text-white px-4 py-2 rounded-lg font-medium">{editingTxId ? 'Salvar' : 'Lançar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
