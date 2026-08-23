const { ipcMain } = require('electron');
const { registerUser, loginUser, updateUserProfile } = require('../services/auth.service');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupAuthHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.AUTH_REGISTER, async (event, { name, username, password }) => {
    try {
      const user = await registerUser(name, username, password);
      return { success: true, user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (event, { username, password }) => {
    try {
      const user = await loginUser(username, password);
      return { success: true, user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });
  ipcMain.handle(IPC_CHANNELS.AUTH_UPDATE_PROFILE, async (event, { userId, data }) => {
    try {
      const user = await updateUserProfile(userId, data);
      return { success: true, user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });
};

module.exports = { setupAuthHandlers };
