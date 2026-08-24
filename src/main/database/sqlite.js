const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

let db = null;

const getDbPath = () => {
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('userData'), 'cash_control.sqlite');
  }
  const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(homeDir, 'Library/Application Support/personal-cash-control/cash_control.sqlite');
};

const hasColumn = (database, tableName, columnName) => {
  try {
    const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(c => c.name === columnName);
  } catch (_) {
    return false;
  }
};

const closeDb = () => {
  if (db) {
    try {
      if (db.open) {
        db.close();
      }
    } catch (err) {
      console.error('Erro ao fechar banco de dados:', err);
    } finally {
      db = null;
    }
  }
};

const initDb = () => {
  if (db && db.open) {
    return db;
  }

  const dbPath = getDbPath();
  
  db = new Database(dbPath, { verbose: console.log });
  console.log('Banco de dados conectado em:', dbPath);

  // Inicializa tabelas base
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      date TEXT NOT NULL,
      category_id INTEGER,
      is_fixed BOOLEAN DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `);

  // Executa migrations pendentes
  const migrations = [
    {
      id: 1,
      name: '001_add_is_paid_to_transactions',
      up: () => {
        if (!hasColumn(db, 'transactions', 'is_paid')) {
          db.exec(`ALTER TABLE transactions ADD COLUMN is_paid BOOLEAN DEFAULT 0;`);
          db.exec(`UPDATE transactions SET is_paid = 1 WHERE type = 'income';`);
        }
      }
    },
    {
      id: 3,
      name: '003_add_credit_cards',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS credit_cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            due_day INTEGER NOT NULL,
            closing_day INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
          );
          
          CREATE TABLE IF NOT EXISTS credit_card_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            credit_card_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            category_id INTEGER,
            installments INTEGER DEFAULT 1,
            installment_number INTEGER DEFAULT 1,
            invoice_month TEXT NOT NULL,
            FOREIGN KEY(credit_card_id) REFERENCES credit_cards(id),
            FOREIGN KEY(category_id) REFERENCES categories(id)
          );
        `);
      }
    },
    {
      id: 4,
      name: '004_add_credit_card_invoices',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS credit_card_invoices (
            credit_card_id INTEGER NOT NULL,
            invoice_month TEXT NOT NULL,
            is_paid BOOLEAN DEFAULT 0,
            PRIMARY KEY (credit_card_id, invoice_month),
            FOREIGN KEY(credit_card_id) REFERENCES credit_cards(id)
          );
        `);
      }
    }
  ];

  const stmtCheck = db.prepare('SELECT count(*) as count FROM migrations WHERE id = ?');
  const stmtInsert = db.prepare('INSERT OR IGNORE INTO migrations (id, name) VALUES (?, ?)');

  for (const migration of migrations) {
    const row = stmtCheck.get(migration.id);
    if (!row || row.count === 0) {
      console.log(`Running migration: ${migration.name}`);
      try {
        db.transaction(() => {
          migration.up();
          stmtInsert.run(migration.id, migration.name);
        })();
        console.log(`Migration ${migration.name} completed successfully.`);
      } catch (err) {
        console.error(`Migration ${migration.name} failed:`, err);
      }
    }
  }

  return db;
};

const restoreDatabase = (tempFilePath) => {
  const dbPath = getDbPath();
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  // 1. Fecha conexão ativa
  closeDb();

  // 2. Remove arquivos auxiliares de WAL e SHM
  if (fs.existsSync(walPath)) {
    try { fs.unlinkSync(walPath); } catch (e) { console.error('Erro ao remover wal:', e); }
  }
  if (fs.existsSync(shmPath)) {
    try { fs.unlinkSync(shmPath); } catch (e) { console.error('Erro ao remover shm:', e); }
  }

  // 3. Substitui arquivo do banco
  fs.copyFileSync(tempFilePath, dbPath);
  try { fs.unlinkSync(tempFilePath); } catch (e) { console.error('Erro ao remover temp:', e); }

  // 4. Reconecta e executa migrations pendentes na base restaurada
  return initDb();
};

const getDb = () => {
  if (!db || !db.open) {
    return initDb();
  }
  return db;
};

module.exports = { initDb, getDb, closeDb, restoreDatabase, getDbPath };
