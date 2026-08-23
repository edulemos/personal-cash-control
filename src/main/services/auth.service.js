const crypto = require('crypto');
const { getDb } = require('../database/sqlite');

/**
 * Cria o hash de uma senha.
 * @param {string} password A senha em texto plano.
 * @returns {Promise<{hash: string, salt: string}>} O hash e o salt.
 */
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt: salt
      });
    });
  });
}

/**
 * Verifica se a senha corresponde ao hash e salt armazenados.
 * @param {string} password A senha fornecida.
 * @param {string} hash O hash armazenado.
 * @param {string} salt O salt armazenado.
 * @returns {Promise<boolean>} Verdadeiro se as senhas coincidirem.
 */
function verifyPassword(password, hash, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(hash === derivedKey.toString('hex'));
    });
  });
}

/**
 * Registra um novo usuário no banco de dados.
 * @param {string} name Nome de exibição.
 * @param {string} username Nome de usuário único.
 * @param {string} password Senha em texto plano.
 * @returns {Promise<Object>} Objeto com informações do usuário criado ou lança erro.
 */
async function registerUser(name, username, password) {
  const db = getDb();
  
  // Verifica se o username já existe
  const stmtCheck = db.prepare('SELECT id FROM users WHERE username = ?');
  const existingUser = stmtCheck.get(username);
  if (existingUser) {
    throw new Error('Nome de usuário já está em uso.');
  }

  // Cria o hash da senha
  const { hash, salt } = await hashPassword(password);

  // Insere no banco
  const stmtInsert = db.prepare('INSERT INTO users (name, username, password_hash, salt) VALUES (?, ?, ?, ?)');
  const info = stmtInsert.run(name, username, hash, salt);
  const newUserId = Number(info.lastInsertRowid);

  // Seeder: Categorias padrão para o novo usuário
  const insertCatStmt = db.prepare('INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)');
  const defaultCategories = [
    [newUserId, 'Alimentação', 'expense', '#ef4444', 'pizza'],
    [newUserId, 'Transporte', 'expense', '#f59e0b', 'car'],
    [newUserId, 'Moradia', 'expense', '#3b82f6', 'home'],
    [newUserId, 'Lazer', 'expense', '#8b5cf6', 'gamepad-2'],
    [newUserId, 'Saúde', 'expense', '#10b981', 'activity'],
    [newUserId, 'Salário', 'income', '#10b981', 'dollar-sign'],
    [newUserId, 'Outros', 'expense', '#64748b', 'more-horizontal']
  ];
  const insertMany = db.transaction((cats) => {
    for (const cat of cats) insertCatStmt.run(...cat);
  });
  insertMany(defaultCategories);

  return {
    id: newUserId,
    name,
    username
  };
}

/**
 * Autentica um usuário.
 * @param {string} username Nome de usuário.
 * @param {string} password Senha em texto plano.
 * @returns {Promise<Object>} Objeto com informações do usuário autenticado ou lança erro.
 */
async function loginUser(username, password) {
  const db = getDb();
  
  // Busca o usuário pelo username
  const stmt = db.prepare('SELECT id, name, username, password_hash, salt FROM users WHERE username = ?');
  const user = stmt.get(username);
  
  if (!user) {
    throw new Error('Credenciais inválidas.');
  }

  // Verifica a senha
  const isValid = await verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    throw new Error('Credenciais inválidas.');
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username
  };
}

/**
 * Atualiza o perfil do usuário.
 * @param {number} userId ID do usuário.
 * @param {Object} data Dados para atualizar (name, username, newPassword, currentPassword).
 * @returns {Promise<Object>} Usuário atualizado.
 */
async function updateUserProfile(userId, { name, username, newPassword, currentPassword }) {
  const db = getDb();
  
  const stmt = db.prepare('SELECT id, name, username, password_hash, salt FROM users WHERE id = ?');
  const user = stmt.get(userId);
  if (!user) throw new Error('Usuário não encontrado.');

  // Check current password
  const isValid = await verifyPassword(currentPassword, user.password_hash, user.salt);
  if (!isValid) throw new Error('Senha atual incorreta.');

  // Check if new username is taken by someone else
  if (username && username !== user.username) {
    const stmtCheck = db.prepare('SELECT id FROM users WHERE username = ?');
    if (stmtCheck.get(username)) {
      throw new Error('Nome de usuário já está em uso.');
    }
  }

  let query = 'UPDATE users SET name = ?, username = ?';
  let params = [name || user.name, username || user.username];

  if (newPassword) {
    const { hash, salt } = await hashPassword(newPassword);
    query += ', password_hash = ?, salt = ?';
    params.push(hash, salt);
  }
  
  query += ' WHERE id = ?';
  params.push(userId);

  db.prepare(query).run(...params);

  return {
    id: userId,
    name: name || user.name,
    username: username || user.username
  };
}

module.exports = {
  registerUser,
  loginUser,
  updateUserProfile
};
