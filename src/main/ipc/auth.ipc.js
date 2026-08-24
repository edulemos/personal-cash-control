const { ipcMain } = require('electron');
const gdriveService = require('../services/gdrive.service');
const { loginWithGoogle } = require('../services/auth.service');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');

const setupAuthHandlers = () => {
  /**
   * Inicia o fluxo OAuth 2.0 completo:
   * abre o browser, aguarda o callback, obtém perfil Google,
   * cria/associa o usuário no banco e retorna os dados da sessão.
   */
  ipcMain.handle(IPC_CHANNELS.AUTH_GOOGLE_LOGIN, async () => {
    try {
      // login() agora retorna { google_id, name, email, picture }
      const googleProfile = await gdriveService.login();
      if (!googleProfile) throw new Error('Não foi possível obter o perfil do Google.');

      const user = await loginWithGoogle(googleProfile);
      return { success: true, user };
    } catch (error) {
      console.error('[auth] Erro no login Google:', error);
      return { success: false, message: error.message };
    }
  });

  /**
   * Restaura sessão a partir de tokens já armazenados (electron-store).
   * Chamado na inicialização do app para auto-login sem abrir browser.
   */
  ipcMain.handle(IPC_CHANNELS.AUTH_GOOGLE_SESSION, async () => {
    try {
      if (!gdriveService.isAuthenticated()) {
        return { success: false, message: 'Sem sessão armazenada.' };
      }

      const googleProfile = await gdriveService.getStoredUserProfile();
      if (!googleProfile) {
        return { success: false, message: 'Token expirado ou inválido.' };
      }

      const user = await loginWithGoogle(googleProfile);
      return { success: true, user };
    } catch (error) {
      console.error('[auth] Erro ao restaurar sessão Google:', error);
      return { success: false, message: error.message };
    }
  });
};

module.exports = { setupAuthHandlers };

