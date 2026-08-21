const { contextBridge, ipcRenderer } = require('electron');

const IPC_CHANNELS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_REGISTER: 'auth:register',
  
  CATEGORIES_GET: 'categories:get',
  CATEGORIES_ADD: 'categories:add',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_DELETE: 'categories:delete',
  
  TRANSACTIONS_GET: 'transactions:get',
  TRANSACTIONS_ADD: 'transactions:add',
  TRANSACTIONS_UPDATE: 'transactions:update',
  TRANSACTIONS_DELETE: 'transactions:delete',
  
  DASHBOARD_STATS: 'dashboard:stats'
};

contextBridge.exposeInMainWorld('api', {
    login: (credentials) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
    register: (userData) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_REGISTER, userData),

    getCategories: (userId) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET, userId),
    addCategory: (category) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_ADD, category),
    updateCategory: (id, category) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, { id, category }),
    deleteCategory: (id) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DELETE, id),
    
    getTransactions: (userId, startDate, endDate) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_GET, { userId, startDate, endDate }),
    addTransaction: (transaction) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_ADD, transaction),
    updateTransaction: (id, transaction) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_UPDATE, { id, transaction }),
    deleteTransaction: (id) => ipcRenderer.invoke(IPC_CHANNELS.TRANSACTIONS_DELETE, id),
    
    getDashboardStats: (userId, startDate, endDate) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS, { userId, startDate, endDate })
});
