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

module.exports = { IPC_CHANNELS };
