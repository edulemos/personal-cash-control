const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const { shell } = require('electron');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const Store = require('electron-store').default;

const store = new Store({ projectName: 'personal-cash-control' });
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'openid',
  'profile',
  'email'
];

class GDriveService {
  constructor() {
    this.oAuth2Client = null;
    this.drive = null;
    this.initClient();
  }

  initClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = 'http://127.0.0.1:3000/oauth2callback';

    if (clientId && clientSecret) {
      this.oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      
      this.oAuth2Client.on('tokens', (newTokens) => {
        const currentTokens = store.get('gdrive_tokens') || {};
        const merged = { ...currentTokens, ...newTokens };
        store.set('gdrive_tokens', merged);
      });

      const tokens = store.get('gdrive_tokens');
      if (tokens) {
        this.oAuth2Client.setCredentials(tokens);
        this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
      }
    }
  }

  hasDriveScope(tokens = null) {
    const t = tokens || store.get('gdrive_tokens');
    if (!t || !t.scope) return false;
    const scopes = typeof t.scope === 'string' ? t.scope.split(' ') : [];
    return scopes.some(s => 
      s === 'https://www.googleapis.com/auth/drive.file' || 
      s === 'https://www.googleapis.com/auth/drive' ||
      s === 'https://www.googleapis.com/auth/drive.appdata'
    );
  }

  isAuthenticated() {
    return !!store.get('gdrive_tokens');
  }

  isDriveAuthorized() {
    return this.isAuthenticated() && this.hasDriveScope();
  }
  
  async getUserInfo() {
    if (!this.isAuthenticated()) return null;
    try {
      const profile = await this.getGoogleUserProfile();
      return profile ? profile.email : null;
    } catch(err) {
      console.error('Erro ao obter email do usuário:', err);
      return null;
    }
  }

  /**
   * Retorna o perfil completo do usuário Google (sub, name, email, picture).
   * Usa a API OAuth2 userinfo para obter dados do perfil.
   */
  async getGoogleUserProfile() {
    if (!this.oAuth2Client) return null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oAuth2Client });
      const { data } = await oauth2.userinfo.get();
      return {
        google_id: data.id,
        name: data.name,
        email: data.email,
        picture: data.picture
      };
    } catch (err) {
      console.error('Erro ao obter perfil Google:', err);
      return null;
    }
  }

  /**
   * Retorna o perfil do usuário Google a partir dos tokens armazenados
   * (chamado durante a inicialização para restaurar a sessão).
   */
  async getStoredUserProfile() {
    if (!this.isAuthenticated()) return null;
    return this.getGoogleUserProfile();
  }

  async login() {
    if (!this.oAuth2Client) throw new Error('Client ID ou Secret não configurados no arquivo .env');

    return new Promise((resolve, reject) => {
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        include_granted_scopes: true
      });

      const server = http.createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/oauth2callback') > -1) {
            const qs = new url.URL(req.url, 'http://127.0.0.1:3000').searchParams;
            const code = qs.get('code');
            
            const { tokens } = await this.oAuth2Client.getToken(code);
            const existingTokens = store.get('gdrive_tokens') || {};
            const mergedTokens = { ...existingTokens, ...tokens };
            
            this.oAuth2Client.setCredentials(mergedTokens);
            store.set('gdrive_tokens', mergedTokens);
            this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });

            const hasDrive = this.hasDriveScope(mergedTokens);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: white; text-align: center; padding-top: 80px; margin: 0;">
                  <div style="max-width: 520px; margin: 0 auto; background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                    ${hasDrive 
                      ? '<h1 style="color: #10b981; font-size: 24px; margin-bottom: 12px;">✓ Google Drive Conectado!</h1><p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">Acesso ao Google Drive autorizado com sucesso. Você já pode fechar esta aba e voltar ao Cash Control.</p>'
                      : '<h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 12px;">⚠️ Atenção: Acesso ao Drive Pendente</h1><p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; text-align: left;">Sua conta Google foi autenticada, porém a caixa de permissão para <strong>gerenciar arquivos no Google Drive não foi selecionada</strong>.<br><br>Para habilitar o backup dos seus dados, volte ao aplicativo e clique em <strong>"Autorizar Google Drive"</strong>, marcando a caixa de seleção na tela do Google.</p>'
                    }
                    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Esta janela pode ser fechada.</p>
                  </div>
                  ${hasDrive ? '<script>setTimeout(() => window.close(), 2500)</script>' : ''}
                </body>
              </html>
            `);
            
            server.closeAllConnections();
            server.close();
            
            // Busca perfil completo do usuário Google
            const googleUser = await this.getGoogleUserProfile();
            resolve({
              ...googleUser,
              hasDriveScope: hasDrive
            });
          }
        } catch (e) {
          reject(e);
        }
      });
      
      server.listen(3000, () => {
        shell.openExternal(authUrl);
      });
    });
  }

  async logout() {
    store.delete('gdrive_tokens');
    this.drive = null;
    if(this.oAuth2Client) {
      this.oAuth2Client.setCredentials(null);
    }
  }

  async uploadDatabase(dbPath) {
    if (!this.isAuthenticated()) throw new Error('Não autenticado com o Google.');
    if (!this.hasDriveScope()) {
      throw new Error('Acesso ao Google Drive não autorizado. Clique no botão "Autorizar Google Drive" e certifique-se de marcar a caixa de seleção na tela do Google.');
    }
    
    try {
      const res = await this.drive.files.list({
        q: "name='cash_control_backup.sqlite' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      
      const fileMetadata = { name: 'cash_control_backup.sqlite' };
      const media = {
        mimeType: 'application/x-sqlite3',
        body: fs.createReadStream(dbPath)
      };

      if (res.data.files.length > 0) {
        const fileId = res.data.files[0].id;
        await this.drive.files.update({
          fileId: fileId,
          media: media
        });
      } else {
        await this.drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
        });
      }
      
      const backupDate = new Date().toISOString();
      store.set('gdrive_last_backup', backupDate);
      return backupDate;
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('insufficient authentication scopes')) {
        throw new Error('Permissão insuficiente no Google Drive. Clique em "Autorizar Google Drive" e marque a opção de permissão na tela do Google.');
      }
      throw err;
    }
  }
  
  async downloadDatabase(destPath) {
    if (!this.isAuthenticated()) throw new Error('Não autenticado com o Google.');
    if (!this.hasDriveScope()) {
      throw new Error('Acesso ao Google Drive não autorizado. Clique no botão "Autorizar Google Drive" e certifique-se de marcar a caixa de seleção na tela do Google.');
    }
    
    try {
      const res = await this.drive.files.list({
        q: "name='cash_control_backup.sqlite' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive'
      });
      
      if (res.data.files.length === 0) {
        throw new Error('Nenhum backup encontrado no Google Drive');
      }
      
      const fileId = res.data.files[0].id;
      const dest = fs.createWriteStream(destPath);
      const response = await this.drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
      
      await pipeline(response.data, dest);
      return true;
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('insufficient authentication scopes')) {
        throw new Error('Permissão insuficiente no Google Drive. Clique em "Autorizar Google Drive" e marque a opção de permissão na tela do Google.');
      }
      throw err;
    }
  }
  
  getLastBackupDate() {
    return store.get('gdrive_last_backup') || null;
  }
}

module.exports = new GDriveService();
