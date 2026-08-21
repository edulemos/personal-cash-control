const { contextBridge, ipcRenderer } = require('electron');

// Inlined to avoid 'require' in sandboxed preload script without a bundler
const IPC_CHANNELS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_REGISTER: 'auth:register',
  ACCOUNTS_GET: 'accounts:get',
  ACCOUNTS_ADD: 'accounts:add'
};

contextBridge.exposeInMainWorld('api', {
    login: (username, password) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, { username, password }),
    register: (name, username, password) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_REGISTER, { name, username, password }),
    getAccounts: () => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_GET),
    addAccount: (account) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_ADD, account)
});
