const Store = require('electron-store').default;
const gdriveService = require('./gdrive.service');
const { getDbPath } = require('../database/sqlite');

const store = new Store();

// Intervalo de checagem: a cada 1 hora (em ms)
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Intervalos configuráveis pelo usuário (em ms)
const BACKUP_INTERVALS = {
  daily:      1 * 24 * 60 * 60 * 1000,
  every3days: 3 * 24 * 60 * 60 * 1000,
  weekly:     7 * 24 * 60 * 60 * 1000,
  off:        null,
};

class AutoBackupService {
  constructor() {
    this._timer = null;
  }

  /**
   * Retorna a configuração atual de backup automático.
   * @returns {{ interval: string, lastBackup: string|null, nextBackup: string|null }}
   */
  getConfig() {
    const interval = store.get('auto_backup_interval', 'daily');
    const lastBackup = store.get('gdrive_last_backup', null);
    const nextBackup = this._computeNextBackup(interval, lastBackup);
    return { interval, lastBackup, nextBackup };
  }

  /**
   * Salva nova configuração de intervalo e reagenda o timer.
   * @param {string} interval - 'daily' | 'every3days' | 'weekly' | 'off'
   */
  setInterval(interval) {
    if (!Object.keys(BACKUP_INTERVALS).includes(interval)) {
      throw new Error(`Intervalo inválido: ${interval}`);
    }
    store.set('auto_backup_interval', interval);
    this.reschedule();
  }

  /**
   * Inicia o serviço. Checa imediatamente e agenda checagens horárias.
   */
  start() {
    this._checkAndBackup();
    this._timer = setInterval(() => this._checkAndBackup(), CHECK_INTERVAL_MS);
    console.log('[AutoBackup] Serviço iniciado.');
  }

  /**
   * Para o timer atual.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      console.log('[AutoBackup] Serviço parado.');
    }
  }

  /**
   * Para e reinicia o timer (chamado ao mudar a configuração).
   */
  reschedule() {
    this.stop();
    this.start();
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  async _checkAndBackup() {
    try {
      const interval = store.get('auto_backup_interval', 'daily');
      const intervalMs = BACKUP_INTERVALS[interval];

      if (!intervalMs) return; // 'off' — não faz nada

      if (!gdriveService.isAuthenticated()) {
        console.log('[AutoBackup] Usuário não autenticado no Google Drive. Pulando backup.');
        return;
      }

      const lastBackupStr = store.get('gdrive_last_backup', null);
      const now = Date.now();

      if (lastBackupStr) {
        const lastBackupMs = new Date(lastBackupStr).getTime();
        const elapsed = now - lastBackupMs;
        if (elapsed < intervalMs) {
          const nextMs = lastBackupMs + intervalMs;
          console.log(`[AutoBackup] Próximo backup agendado para: ${new Date(nextMs).toLocaleString('pt-BR')}`);
          return;
        }
      }

      console.log('[AutoBackup] Realizando backup automático...');
      const dbPath = getDbPath();
      const backupDate = await gdriveService.uploadDatabase(dbPath);
      console.log(`[AutoBackup] Backup concluído em: ${new Date(backupDate).toLocaleString('pt-BR')}`);
    } catch (err) {
      console.error('[AutoBackup] Erro ao realizar backup automático:', err.message);
    }
  }

  _computeNextBackup(interval, lastBackupStr) {
    const intervalMs = BACKUP_INTERVALS[interval];
    if (!intervalMs || !lastBackupStr) return null;
    const next = new Date(new Date(lastBackupStr).getTime() + intervalMs);
    return next.toISOString();
  }
}

module.exports = new AutoBackupService();
