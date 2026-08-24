const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const { shell } = require('electron');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const Store = require('electron-store').default;

const store = new Store();
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
      
      const tokens = store.get('gdrive_tokens');
      if (tokens) {
        this.oAuth2Client.setCredentials(tokens);
        this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
      }
    }
  }

  isAuthenticated() {
    return !!this.drive;
  }
  
  async getUserInfo() {
    if (!this.isAuthenticated()) return null;
    try {
      const res = await this.drive.about.get({ fields: 'user' });
      return res.data.user.emailAddress;
    } catch(err) {
      console.error(err);
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
        prompt: 'consent'
      });

      const server = http.createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/oauth2callback') > -1) {
            const qs = new url.URL(req.url, 'http://127.0.0.1:3000').searchParams;
            const code = qs.get('code');
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; background: #0f172a; color: white; text-align: center; margin-top: 100px; font-family: 'Inter', sans-serif;">
                  <h1 style="color: #10b981;">✓ Autenticação concluída!</h1>
                  <p style="color: #94a3b8;">Você pode fechar esta janela e voltar ao Cash Control.</p>
                  <script>setTimeout(() => window.close(), 1500)</script>
                </body>
              </html>
            `);
            
            server.closeAllConnections();
            server.close();
            
            const { tokens } = await this.oAuth2Client.getToken(code);
            this.oAuth2Client.setCredentials(tokens);
            store.set('gdrive_tokens', tokens);
            this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
            
            // Busca perfil completo do usuário Google
            const googleUser = await this.getGoogleUserProfile();
            resolve(googleUser);
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
    if (!this.isAuthenticated()) throw new Error('Não autenticado no Google Drive');
    
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
  }
  
  async downloadDatabase(destPath) {
    if (!this.isAuthenticated()) throw new Error('Não autenticado no Google Drive');
    
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
  }
  
  getLastBackupDate() {
    return store.get('gdrive_last_backup') || null;
  }
}

module.exports = new GDriveService();
