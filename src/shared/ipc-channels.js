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

  BANKS_GET: 'banks:get',
  BANKS_ADD: 'banks:add',
  BANKS_UPDATE: 'banks:update',
  BANKS_DELETE: 'banks:delete',

  DEPOSITS_GET: 'deposits:get',
  DEPOSITS_ADD: 'deposits:add',
  DEPOSITS_UPDATE: 'deposits:update',
  DEPOSITS_DELETE: 'deposits:delete',
  DEPOSITS_TOGGLE_STATUS: 'deposits:toggle-status',

  DESCRIPTIONS_AUTOCOMPLETE: 'descriptions:autocomplete',

  PIN_STATUS: 'pin:status',
  PIN_SET: 'pin:set',
  PIN_VERIFY: 'pin:verify',
  PIN_REMOVE: 'pin:remove',
};

module.exports = { IPC_CHANNELS };
