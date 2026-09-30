const { ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const geminiService = require('../services/gemini.service');
const reconciliationService = require('../services/reconciliation.service');
const { IPC_CHANNELS } = require('../../shared/ipc-channels');
const { getDb } = require('../database/sqlite');

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.csv':
      return 'text/csv';
    case '.ofx':
      return 'text/plain';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function setupGeminiHandlers() {
  // --- STATUS DA API KEY ---
  ipcMain.handle(IPC_CHANNELS.GEMINI_STATUS, async () => {
    try {
      const hasKey = geminiService.hasKey();
      return {
        hasKey,
        isConfigured: hasKey
      };
    } catch (err) {
      console.error('Erro ao verificar status da chave Gemini:', err);
      return { hasKey: false, isConfigured: false, error: err.message };
    }
  });

  // --- SALVAR E VERIFICAR API KEY ---
  ipcMain.handle(IPC_CHANNELS.GEMINI_SAVE_KEY, async (event, apiKey) => {
    try {
      if (!apiKey || !apiKey.trim()) {
        return { success: false, error: 'A chave de API não pode estar vazia.' };
      }

      // Valida a chave com a API antes de salvar
      const validation = await geminiService.validateKey(apiKey.trim());
      if (!validation.valid) {
        return { success: false, error: validation.error || 'Chave de API inválida.' };
      }

      // Salva de forma criptografada
      geminiService.setKey(apiKey.trim());
      return { success: true };
    } catch (err) {
      console.error('Erro ao salvar chave Gemini:', err);
      return { success: false, error: err.message };
    }
  });

  // --- REMOVER API KEY ---
  ipcMain.handle(IPC_CHANNELS.GEMINI_REMOVE_KEY, async () => {
    try {
      geminiService.removeKey();
      return { success: true };
    } catch (err) {
      console.error('Erro ao remover chave Gemini:', err);
      return { success: false, error: err.message };
    }
  });

  // --- DIALOG PARA SELEÇÃO DE ARQUIVO ---
  ipcMain.handle(IPC_CHANNELS.RECONCILIATION_SELECT_FILE, async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Selecione a fatura do cartão ou extrato bancário',
        filters: [
          { name: 'Documentos e Extratos', extensions: ['pdf', 'ofx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'webp'] },
          { name: 'Fatura em PDF', extensions: ['pdf'] },
          { name: 'Extrato OFX / CSV', extensions: ['ofx', 'csv', 'txt'] },
          { name: 'Imagens / Prints', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
          { name: 'Todos os Arquivos', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      return {
        canceled: false,
        filePath,
        fileName
      };
    } catch (err) {
      console.error('Erro ao abrir diálogo de arquivo:', err);
      return { canceled: true, error: err.message };
    }
  });

  // --- PROCESSAMENTO DA IA E CONCILIAÇÃO ---
  ipcMain.handle(IPC_CHANNELS.RECONCILIATION_PROCESS, async (event, params) => {
    try {
      const { filePath, documentType, creditCardId, invoiceMonth, userId, startDate, endDate } = params;

      if (!filePath) {
        return { success: false, error: 'Caminho do arquivo não fornecido.' };
      }

      if (!geminiService.hasKey()) {
        return { success: false, error: 'Chave de API do Gemini não configurada ou não verificada.' };
      }

      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const mimeType = getMimeType(filePath);

      const db = getDb();
      // Pega categorias do usuário para apoiar a IA
      const categories = db.prepare('SELECT id, name, type FROM categories WHERE user_id = ?').all(userId) || [];
      // Pega pessoas do usuário
      const people = db.prepare('SELECT id, name FROM people WHERE user_id = ?').all(userId) || [];

      // 1. Extração estruturada via Gemini
      const parsedData = await geminiService.extractFinancialRecords({
        fileBuffer,
        fileName,
        mimeType,
        categories,
        people,
        documentType
      });

      // 2. Conciliação com os registros já gravados no banco
      let reconciliationItems = [];
      if (documentType === 'credit_card') {
        reconciliationItems = reconciliationService.reconcileCreditCard(
          creditCardId,
          invoiceMonth,
          parsedData.records || []
        );
      } else {
        reconciliationItems = reconciliationService.reconcileBankTransactions(
          userId,
          startDate || parsedData.period?.start || new Date().toISOString().slice(0, 10),
          endDate || parsedData.period?.end || new Date().toISOString().slice(0, 10),
          parsedData.records || []
        );
      }

      return {
        success: true,
        institution: parsedData.institution,
        period: parsedData.period,
        totalAmount: parsedData.total_amount,
        items: reconciliationItems
      };
    } catch (err) {
      console.error('Erro no processamento de conciliação:', err);
      return { success: false, error: err.message };
    }
  });

  // --- APLICAÇÃO DOS AJUSTES (AUTO-AJUSTE OU POR ITEM) ---
  ipcMain.handle(IPC_CHANNELS.RECONCILIATION_APPLY, async (event, params) => {
    try {
      const { documentType, creditCardId, invoiceMonth, userId, itemsToApply } = params;

      if (!Array.isArray(itemsToApply) || itemsToApply.length === 0) {
        return { success: false, error: 'Nenhum item selecionado para ajuste.' };
      }

      const result = reconciliationService.applyReconciliation({
        documentType,
        creditCardId,
        invoiceMonth,
        userId,
        itemsToApply
      });

      return result;
    } catch (err) {
      console.error('Erro ao aplicar conciliação:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = setupGeminiHandlers;
