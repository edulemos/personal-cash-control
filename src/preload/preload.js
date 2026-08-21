const { contextBridge, ipcRenderer } = require('electron');

// Inlined to avoid 'require' in sandboxed preload script without a bundler
const IPC_CHANNELS = {
  ACCOUNTS_GET: 'accounts:get',
  ACCOUNTS_ADD: 'accounts:add'
};

contextBridge.exposeInMainWorld('api', {
    getAccounts: () => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_GET),
    addAccount: (account) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_ADD, account)
});
