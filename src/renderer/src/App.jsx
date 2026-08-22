import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import CreditCards from './pages/CreditCards';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { LayoutDashboard, Receipt, Tags, CreditCard, Settings as SettingsIcon, LogOut } from 'lucide-react';
import clsx from 'clsx';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [updateStatus, setUpdateStatus] = useState(null);
  
  // Mês global (formato YYYY-MM)
  const [globalMonth, setGlobalMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    // Configura listeners para auto-update se estiverem expostos no preload
    if (window.api && window.api.onUpdateAvailable) {
      window.api.onUpdateAvailable(() => setUpdateStatus('available'));
      window.api.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    }
  }, []);

  // Calcula startDate e endDate derivados do mês global
  const { startDate, endDate } = React.useMemo(() => {
    const [year, month] = globalMonth.split('-').map(Number);
    // Para resolver problemas de fuso horário, montamos a string direto
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Último dia do mês
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  }, [globalMonth]);

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <div className="flex h-full w-full bg-bg-main text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-card border-r border-white/5 flex flex-col pt-6">
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
            onClick={() => setCurrentView('credit_cards')}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium',
              currentView === 'credit_cards'
                ? 'bg-accent/10 text-accent'
                : 'text-text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <CreditCard size={20} />
            Cartões
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
          <button
            onClick={() => setCurrentView('settings')}
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium',
              currentView === 'settings'
                ? 'bg-accent/10 text-accent'
                : 'text-text-muted hover:bg-white/5 hover:text-white'
            )}
          >
            <SettingsIcon size={20} />
            Configurações
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
              Mês de Referência:
              <input 
                type="month" 
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-accent"
                value={globalMonth}
                onChange={e => setGlobalMonth(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 pt-16">
          {currentView === 'dashboard' && <Dashboard userId={user.id} startDate={startDate} endDate={endDate} />}
          {currentView === 'transactions' && <Transactions userId={user.id} startDate={startDate} endDate={endDate} />}
          {currentView === 'credit_cards' && <CreditCards userId={user.id} globalMonth={globalMonth} />}
          {currentView === 'categories' && <Categories userId={user.id} />}
          {currentView === 'settings' && <Settings />}
        </div>
        
        {/* Update Toast */}
        {updateStatus && (
          <div className="absolute bottom-8 right-8 bg-blue-500 text-white px-6 py-4 rounded-xl shadow-xl z-50 flex flex-col gap-2 max-w-sm">
            <h3 className="font-bold text-lg">
              {updateStatus === 'available' ? 'Baixando atualização...' : 'Atualização pronta!'}
            </h3>
            <p className="text-sm text-blue-100">
              {updateStatus === 'available' 
                ? 'Uma nova versão está sendo baixada em segundo plano.' 
                : 'A nova versão já foi baixada. Clique abaixo para reiniciar e instalar.'}
            </p>
            {updateStatus === 'downloaded' && (
              <button 
                onClick={() => window.api.installUpdate()}
                className="mt-2 bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Reiniciar e Instalar
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
