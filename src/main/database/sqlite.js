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
        db.exec(`ALTER TABLE transactions ADD COLUMN is_paid BOOLEAN DEFAULT 0;`);
        // Atualiza as receitas para is_paid = 1 por padrão para não impactar saldo se aplicável
        db.exec(`UPDATE transactions SET is_paid = 1 WHERE type = 'income';`);
      }
    }
  ];

  const stmtCheck = db.prepare('SELECT count(*) as count FROM migrations WHERE id = ?');
  const stmtInsert = db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)');

  for (const migration of migrations) {
    const row = stmtCheck.get(migration.id);
    if (row.count === 0) {
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

const getDb = () => db;

module.exports = { initDb, getDb };
