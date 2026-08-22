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
  
  CREDIT_CARDS_GET: 'credit_cards:get',
  CREDIT_CARDS_ADD: 'credit_cards:add',
  CREDIT_CARDS_UPDATE: 'credit_cards:update',
  CREDIT_CARDS_DELETE: 'credit_cards:delete',
  
  CREDIT_CARD_TRANSACTIONS_GET: 'credit_card_transactions:get',
  CREDIT_CARD_TRANSACTIONS_ADD: 'credit_card_transactions:add',
  CREDIT_CARD_TRANSACTIONS_DELETE: 'credit_card_transactions:delete',
  
  DASHBOARD_STATS: 'dashboard:stats',
  
  SETTINGS_GDRIVE_STATUS: 'settings:gdrive:status',
  SETTINGS_GDRIVE_LOGIN: 'settings:gdrive:login',
  SETTINGS_GDRIVE_LOGOUT: 'settings:gdrive:logout',
  SETTINGS_GDRIVE_BACKUP: 'settings:gdrive:backup',
  SETTINGS_GDRIVE_RESTORE: 'settings:gdrive:restore',
  APP_GET_VERSION: 'app:get_version'
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
    
    getCreditCards: (userId) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARDS_GET, userId),
    addCreditCard: (card) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARDS_ADD, card),
    updateCreditCard: (id, card) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARDS_UPDATE, { id, card }),
    deleteCreditCard: (id) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARDS_DELETE, id),
    
    getCreditCardTransactions: (creditCardId, invoiceMonth) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_GET, { creditCardId, invoiceMonth }),
    addCreditCardTransaction: (tx) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_ADD, tx),
    updateCreditCardTransaction: (id, tx) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_UPDATE, { id, tx }),
    deleteCreditCardTransaction: (id) => ipcRenderer.invoke(IPC_CHANNELS.CREDIT_CARD_TRANSACTIONS_DELETE, id),
    
    getDashboardStats: (userId, startDate, endDate) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS, { userId, startDate, endDate }),

    gdriveStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_STATUS),
    gdriveLogin: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_LOGIN),
    gdriveLogout: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_LOGOUT),
    gdriveBackup: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_BACKUP),
    gdriveRestore: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_RESTORE),

    getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),

    onUpdateAvailable: (callback) => ipcRenderer.on('updater:available', (_, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('updater:downloaded', (_, info) => callback(info)),
    installUpdate: () => ipcRenderer.invoke('updater:restart')
});
