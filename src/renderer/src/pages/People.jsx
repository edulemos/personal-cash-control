import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Users } from 'lucide-react';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

export default function People({ userId }) {
  const [people, setPeople] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', avatar_color: AVATAR_COLORS[0] });
  const [error, setError] = useState('');

  const fetchPeople = async () => {
    try {
      const list = await window.api.getPeople(userId);
      setPeople(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erro ao buscar pessoas:', err);
    }
  };

  useEffect(() => { fetchPeople(); }, [userId]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', avatar_color: AVATAR_COLORS[0] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (person) => {
    setEditingId(person.id);
    setForm({ name: person.name, avatar_color: person.avatar_color });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Informe o nome da pessoa.'); return; }
    setError('');
    if (editingId) {
      await window.api.updatePerson(editingId, form);
    } else {
      await window.api.addPerson({ ...form, user_id: userId });
    }
    closeModal();
    fetchPeople();
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir esta pessoa? Os gastos associados serão mantidos sem vínculo.')) {
      await window.api.deletePerson(id);
      fetchPeople();
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">Pessoas</h2>
          <p className="text-text-muted">Associe pessoas aos gastos para saber quem gastou o quê</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Nova Pessoa
        </button>
      </header>

      {people.length === 0 ? (
        <div className="flex-1 glass-panel flex flex-col items-center justify-center gap-4 text-text-muted">
          <Users size={48} className="opacity-30" />
          <p className="text-lg font-medium">Nenhuma pessoa cadastrada</p>
          <p className="text-sm">Cadastre pessoas para associá-las aos seus gastos</p>
          <button onClick={openAdd} className="mt-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors">
            <Plus size={18} /> Adicionar Pessoa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {people.map(person => (
            <div
              key={person.id}
              className="glass-panel p-5 rounded-xl flex flex-col items-center gap-3 relative group"
            >
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg"
                style={{ backgroundColor: person.avatar_color }}
              >
                {getInitials(person.name)}
              </div>
              <span className="font-semibold text-center">{person.name}</span>

              {/* Ações */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(person)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 text-text-muted transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(person.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-text-muted transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm p-6">
            <h2 className="text-xl font-bold mb-5">{editingId ? 'Editar Pessoa' : 'Nova Pessoa'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Preview do avatar */}
              <div className="flex justify-center mb-2">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-colors"
                  style={{ backgroundColor: form.avatar_color }}
                >
                  {getInitials(form.name) || '?'}
                </div>
              </div>

              <input
                type="text"
                placeholder="Nome da pessoa"
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }}
                className={`w-full bg-black/30 border rounded-lg p-3 outline-none focus:border-accent text-white transition-colors ${error ? 'border-rose-500' : 'border-white/10'}`}
              />
              {error && <p className="text-xs text-rose-400 -mt-2">{error}</p>}

              {/* Paleta de cores */}
              <div>
                <label className="text-xs text-text-muted mb-2 block">Cor do Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, avatar_color: color })}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
                      style={{
                        backgroundColor: color,
                        boxShadow: form.avatar_color === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-text-muted hover:text-white transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded-lg font-medium transition-colors">
                  {editingId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
