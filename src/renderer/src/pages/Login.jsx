import React, { useState, useEffect } from 'react';
import { Lock, User } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Login({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cashControlUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        onLoginSuccess(user);
      } catch (_) {}
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const res = await window.api.register(form);
        if (res.success) {
          if (rememberMe) {
            localStorage.setItem('cashControlUser', JSON.stringify(res.user));
          }
          onLoginSuccess(res.user);
        } else {
          setError(res.message);
        }
      } else {
        const res = await window.api.login({ username: form.username, password: form.password });
        if (res.success) {
          if (rememberMe) {
            localStorage.setItem('cashControlUser', JSON.stringify(res.user));
          }
          onLoginSuccess(res.user);
        } else {
          setError(res.message);
        }
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Logo Superior Esquerda */}
      <div className="absolute top-8 left-8 flex items-center gap-3 z-20">
        <img 
          src={logoImg} 
          alt="Cash Control Logo" 
          className="w-12 h-12 rounded-xl shadow-lg"
        />
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-blue-400">
          Cash Control
        </span>
      </div>

      <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden z-10">
        {/* Decoração de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-blue-400">
            Cash Control
          </h1>
          <p className="text-text-muted mt-2">
            {isRegistering ? 'Crie sua conta para começar' : 'Faça login para continuar'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center relative z-10">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  required 
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-accent transition-colors"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Seu nome"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Usuário</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <User size={18} />
              </div>
              <input 
                type="text" 
                required 
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-accent transition-colors"
                value={form.username}
                onChange={e => setForm({...form, username: e.target.value})}
                placeholder="Ex: admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                required 
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-accent transition-colors"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center mb-4">
            <input 
              type="checkbox" 
              id="rememberMe"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-accent bg-black/20 border border-white/10 rounded"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-text-muted">Lembrar-me</label>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-xl transition-colors mt-6 disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-muted relative z-10">
          {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
          <button 
            type="button" 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="ml-2 text-accent hover:text-accent-hover font-medium transition-colors"
          >
            {isRegistering ? 'Fazer login' : 'Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}
