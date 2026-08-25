const { contextBridge, ipcRenderer } = require('electron');

const IPC_CHANNELS = {
  AUTH_GOOGLE_LOGIN: 'auth:google:login',
  AUTH_GOOGLE_SESSION: 'auth:google:session',
  
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
  CREDIT_CARD_TRANSACTIONS_UPDATE: 'credit_card_transactions:update',
  CREDIT_CARD_TRANSACTIONS_DELETE: 'credit_card_transactions:delete',
  
  DASHBOARD_STATS: 'dashboard:stats',
  DASHBOARD_CATEGORY_EXPENSES: 'dashboard:category-expenses',
  DASHBOARD_PEOPLE_EXPENSES: 'dashboard:people-expenses',
  
  SETTINGS_GDRIVE_STATUS: 'settings:gdrive:status',
  SETTINGS_GDRIVE_LOGIN: 'settings:gdrive:login',
  SETTINGS_GDRIVE_LOGOUT: 'settings:gdrive:logout',
  SETTINGS_GDRIVE_BACKUP: 'settings:gdrive:backup',
  SETTINGS_GDRIVE_RESTORE: 'settings:gdrive:restore',
  SETTINGS_AUTO_BACKUP_GET: 'settings:auto-backup:get',
  SETTINGS_AUTO_BACKUP_SET: 'settings:auto-backup:set',
  APP_GET_VERSION: 'app:get_version',

  PEOPLE_GET: 'people:get',
  PEOPLE_ADD: 'people:add',
  PEOPLE_UPDATE: 'people:update',
  PEOPLE_DELETE: 'people:delete',
};

contextBridge.exposeInMainWorld('api', {
    // Autenticação via Google OAuth 2.0
    loginWithGoogle: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GOOGLE_LOGIN),
    googleSession: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GOOGLE_SESSION),

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
    getCategoryExpenses: (userId, startDate, endDate) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_CATEGORY_EXPENSES, { userId, startDate, endDate }),
    getPeopleExpenses: (userId, startDate, endDate) => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_PEOPLE_EXPENSES, { userId, startDate, endDate }),

    getPeople: (userId) => ipcRenderer.invoke(IPC_CHANNELS.PEOPLE_GET, userId),
    addPerson: (person) => ipcRenderer.invoke(IPC_CHANNELS.PEOPLE_ADD, person),
    updatePerson: (id, person) => ipcRenderer.invoke(IPC_CHANNELS.PEOPLE_UPDATE, { id, person }),
    deletePerson: (id) => ipcRenderer.invoke(IPC_CHANNELS.PEOPLE_DELETE, id),

    gdriveStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_STATUS),
    gdriveLogin: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_LOGIN),
    gdriveLogout: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_LOGOUT),
    gdriveBackup: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_BACKUP),
    gdriveRestore: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GDRIVE_RESTORE),

    getAutoBackupConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_AUTO_BACKUP_GET),
    setAutoBackupInterval: (interval) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_AUTO_BACKUP_SET, interval),

    getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),

    onUpdateAvailable: (callback) => ipcRenderer.on('updater:available', (_, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('updater:downloaded', (_, info) => callback(info)),
    onUpdateError: (callback) => ipcRenderer.on('updater:error', (_, err) => callback(err)),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    checkUpdate: () => ipcRenderer.invoke('updater:check'),
    installUpdate: () => ipcRenderer.invoke('updater:restart')
});
