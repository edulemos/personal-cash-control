import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Login from './pages/Login';
import { LayoutDashboard, Receipt, Tags, LogOut } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Período padrão: primeiro e último dia do mês corrente
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <div className="flex h-full w-full bg-bg-main text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card border-r border-white/5 flex flex-col">
        <div className="top-bar flex items-center justify-center w-full">
          {/* Drag area for OS */}
        </div>
        <div className="p-6 pb-2">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-hover">
            Cash Control
          </h1>
          <p className="text-sm text-text-muted mt-1">Olá, {user.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium',
              currentView === 'dashboard'
                ? 'bg-accent/10 text-accent'
                : 'text-text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView('transactions')}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium',
              currentView === 'transactions'
                ? 'bg-accent/10 text-accent'
                : 'text-text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <Receipt size={20} />
            Transações
          </button>
          <button
            onClick={() => setCurrentView('categories')}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium',
              currentView === 'categories'
                ? 'bg-accent/10 text-accent'
                : 'text-text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <Tags size={20} />
            Categorias
          </button>
        </nav>
        
        <div className="p-4 border-t border-white/5">
            <button 
              onClick={() => {
                localStorage.removeItem('cashControlUser');
                setUser(null);
                setCurrentView('dashboard');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:bg-white/5 hover:text-rose-400 transition-colors font-medium"
            >
              <LogOut size={20} />
              Sair
            </button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="top-bar w-full absolute top-0 left-0 z-10 flex items-center pl-8 pt-4">
          <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <label className="text-xs text-text-muted flex items-center gap-2">
              De:
              <input 
                type="date" 
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-accent"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </label>
            <label className="text-xs text-text-muted flex items-center gap-2">
              Até:
              <input 
                type="date" 
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-accent"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 pt-16">
          {currentView === 'dashboard' && <Dashboard userId={user.id} startDate={startDate} endDate={endDate} />}
          {currentView === 'transactions' && <Transactions userId={user.id} startDate={startDate} endDate={endDate} />}
          {currentView === 'categories' && <Categories userId={user.id} />}
        </div>
      </main>
    </div>
  );
}

export default App;
