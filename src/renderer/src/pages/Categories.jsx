import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Edit2 } from 'lucide-react';
import clsx from 'clsx';

export default function Categories({ userId }) {
  const [categories, setCategories] = useState([]);
  
  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ 
    name: '', 
    type: 'expense', 
    color: '#3b82f6', 
    icon: 'tag' 
  });
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const cats = await window.api.getCategories(userId);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const payload = {
        user_id: userId,
        name: form.name,
        type: form.type,
        color: form.color,
        icon: form.icon
      };

      if (editingId) {
        await window.api.updateCategory(editingId, payload);
      } else {
        await window.api.addCategory(payload);
      }
      
      closeModal();
      fetchData();
    } catch (err) {
      setError('Ocorreu um erro ao salvar a categoria.');
      console.error(err);
    }
  };

  const openEditModal = (c) => {
    setForm({
      name: c.name,
      type: c.type,
      color: c.color,
      icon: c.icon
    });
    setEditingId(c.id);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError('');
    setForm({ name: '', type: 'expense', color: '#3b82f6', icon: 'tag' });
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        const res = await window.api.deleteCategory(id);
        if (!res.success) {
          alert(res.message);
        } else {
          fetchData();
        }
      } catch (err) {
        alert('Erro ao excluir categoria.');
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col relative z-0">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold">Categorias</h2>
          <p className="text-text-muted">Gerencie as categorias de transações</p>
        </div>
        <button 
            onClick={() => {
              setEditingId(null);
              setForm({ name: '', type: 'expense', color: '#3b82f6', icon: 'tag' });
              setShowModal(true);
            }} 
            className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
          >
          <Plus size={20} />
          Nova Categoria
        </button>
      </div>

      <div className="glass-panel overflow-hidden flex-1 flex flex-col border border-white/5 shadow-2xl rounded-2xl">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-text-muted text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium text-center w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-text-muted">
                    Nenhuma categoria encontrada.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-medium flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }}></div>
                      {c.name}
                    </td>
                    <td className="p-4">
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        c.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      )}>
                        {c.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => openEditModal(c)} className="p-2 text-text-muted hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors" title="Editar">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 text-text-muted hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors" title="Excluir">
                          <Trash2 size={18} />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6 relative overflow-hidden shadow-2xl border border-white/10">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              
              <div className="flex gap-4 mb-2">
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="type" value="expense" className="peer sr-only" checked={form.type === 'expense'} onChange={e => setForm({...form, type: e.target.value})} />
                  <div className="text-center py-2 px-3 rounded-lg border border-white/10 text-text-muted peer-checked:bg-rose-500/20 peer-checked:text-rose-400 peer-checked:border-rose-500/50 transition-all font-medium text-sm">
                    Despesa
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="type" value="income" className="peer sr-only" checked={form.type === 'income'} onChange={e => setForm({...form, type: e.target.value})} />
                  <div className="text-center py-2 px-3 rounded-lg border border-white/10 text-text-muted peer-checked:bg-emerald-500/20 peer-checked:text-emerald-400 peer-checked:border-emerald-500/50 transition-all font-medium text-sm">
                    Receita
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Nome da Categoria</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <Tag size={18} />
                  </div>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-accent transition-colors"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Ex: Assinaturas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Cor Visual</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    required 
                    className="w-12 h-12 rounded bg-black/20 border border-white/10 cursor-pointer"
                    value={form.color}
                    onChange={e => setForm({...form, color: e.target.value})}
                  />
                  <div className="text-sm text-text-muted font-mono">{form.color}</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
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
