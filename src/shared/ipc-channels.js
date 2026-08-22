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
  CREDIT_CARD_TRANSACTIONS_UPDATE: 'credit_card_transactions:update',
  CREDIT_CARD_TRANSACTIONS_DELETE: 'credit_card_transactions:delete',
  
  DASHBOARD_STATS: 'dashboard:stats',

  SETTINGS_GDRIVE_STATUS: 'settings:gdrive:status',
  SETTINGS_GDRIVE_LOGIN: 'settings:gdrive:login',
  SETTINGS_GDRIVE_LOGOUT: 'settings:gdrive:logout',
  SETTINGS_GDRIVE_BACKUP: 'settings:gdrive:backup',
  SETTINGS_GDRIVE_RESTORE: 'settings:gdrive:restore'
};

module.exports = { IPC_CHANNELS };
