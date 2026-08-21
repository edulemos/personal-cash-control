const Database = require('better-sqlite3');
const path = require('node:path');
const { app } = require('electron');

let db;

const initDb = () => {
  // Armazena o banco de dados na pasta userData (garante persistência entre atualizações)
  const dbPath = path.join(app.getPath('userData'), 'cash_control.sqlite');
  
  db = new Database(dbPath, { verbose: console.log });
  console.log('Banco de dados conectado em:', dbPath);

  // Criar as tabelas base caso não existam
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      date TEXT NOT NULL,
      category_id INTEGER,
      account_id INTEGER,
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
  `);

  return db;
};

const getDb = () => db;

module.exports = { initDb, getDb };
