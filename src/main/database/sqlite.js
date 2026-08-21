const Database = require('better-sqlite3');
const path = require('node:path');
const { app } = require('electron');

let db;

const initDb = () => {
  // Armazena o banco de dados na pasta userData (garante persistência entre atualizações)
  const dbPath = path.join(app.getPath('userData'), 'cash_control.sqlite');
  
  db = new Database(dbPath, { verbose: console.log });
  console.log('Banco de dados conectado em:', dbPath);

  // ATENÇÃO: Dropando tabelas apenas durante esta fase de testes para atualizar o schema.
  // Em produção, isso seria feito via migrations seguras.
  db.exec(`
    DROP TABLE IF EXISTS transactions;
    DROP TABLE IF EXISTS accounts;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL
    );

    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      date TEXT NOT NULL,
      category_id INTEGER,
      account_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(category_id) REFERENCES categories(id),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    );
  `);

  return db;
};

const getDb = () => db;

module.exports = { initDb, getDb };
