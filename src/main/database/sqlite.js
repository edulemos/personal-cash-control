const Database = require('better-sqlite3');
const path = require('node:path');
const { app } = require('electron');

let db;

const initDb = () => {
  // Armazena o banco de dados na pasta userData (garante persistência entre atualizações)
  const dbPath = path.join(app.getPath('userData'), 'cash_control.sqlite');
  
  db = new Database(dbPath, { verbose: console.log });
  console.log('Banco de dados conectado em:', dbPath);

  // ATENÇÃO: As tabelas agora não são apagadas no reinício para persistir os dados.
  // Em produção, modificações estruturais seriam feitas via migrations seguras.
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
  `);

  return db;
};

const getDb = () => db;

module.exports = { initDb, getDb };
