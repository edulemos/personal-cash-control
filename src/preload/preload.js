const { contextBridge, ipcRenderer } = require('electron');

const IPC_CHANNELS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_REGISTER: 'auth:register',
  
  CATEGORIES_GET: 'categories:get',
  CATEGORIES_ADD: 'categories:add',
  
  TRANSACTIONS_GET: 'transactions:get',
  TRANSACTIONS_ADD: 'transactions:add',
  TRANSACTIONS_DELETE: 'transactions:delete',
  
  DASHBOARD_STATS: 'dashboard:stats'
};

contextBridge.exposeInMainWorld('api', {
    login: (credentials) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
    register: (userData) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_REGISTER, userData),

    getCategories: (userId) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET, userId),
    addCategory: (category) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_ADD, category),
    
    getTransactions: (userId, startDate, endDate) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_GET, { userId, startDate, endDate }),
    addTransaction: (transaction) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_ADD, transaction),
    deleteTransaction: (id) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_DELETE, id),
    
    getDashboardStats: (userId, startDate, endDate) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS, { userId, startDate, endDate })
});
