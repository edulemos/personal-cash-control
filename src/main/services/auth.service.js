const { getDb } = require('../database/sqlite');

/**
 * Autentica ou cria um usuário via Google OAuth 2.0.
 *
 * Estratégia de migração transparente:
 * 1. Busca usuário pelo google_id → já migrado, retorna direto.
 * 2. Não encontrou → verifica se existe exatamente 1 usuário no banco sem google_id.
 *    Se sim, associa o google_id a ele (migração de conta existente, sem perda de dados).
 * 3. Nenhum usuário no banco → cria um novo com os dados do Google.
 *
 * @param {{ google_id: string, name: string, email: string, picture: string }} googleProfile
 * @returns {{ id: number, name: string, email: string, picture: string }}
 */
async function loginWithGoogle({ google_id, name, email, picture }) {
  if (!google_id) throw new Error('Perfil Google inválido: google_id ausente.');

  const db = getDb();

  // 1. Usuário já associado a este google_id
  const existing = db.prepare(
    'SELECT id, name, email, picture FROM users WHERE google_id = ?'
  ).get(google_id);

  if (existing) {
    // Atualiza nome/foto caso tenham mudado no Google
    db.prepare(
      'UPDATE users SET name = ?, email = ?, picture = ? WHERE id = ?'
    ).run(name, email, picture ?? existing.picture, existing.id);

    return { id: existing.id, name, email, picture: picture ?? existing.picture };
  }

  // 2. Migração transparente: existe 1 usuário legacy sem google_id?
  const legacyUsers = db.prepare(
    'SELECT id, name FROM users WHERE google_id IS NULL'
  ).all();

  if (legacyUsers.length === 1) {
    const legacy = legacyUsers[0];
    db.prepare(
      'UPDATE users SET google_id = ?, email = ?, picture = ?, name = ? WHERE id = ?'
    ).run(google_id, email, picture, name, legacy.id);

    console.log(`[auth] Usuário legado ID=${legacy.id} associado ao Google ID=${google_id}`);
    return { id: legacy.id, name, email, picture };
  }

  // 3. Nenhum usuário no banco → cria novo
  // username derivado do email para satisfazer constraint UNIQUE (campo legado)
  const username = email.split('@')[0] + '_' + Date.now();
  const info = db.prepare(
    `INSERT INTO users (name, username, password_hash, salt, google_id, email, picture)
     VALUES (?, ?, '', '', ?, ?, ?)`
  ).run(name, username, google_id, email, picture);
  const newUserId = Number(info.lastInsertRowid);

  // Seeder: categorias padrão para conta nova
  const insertCatStmt = db.prepare(
    'INSERT INTO categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)'
  );
  const defaultCategories = [
    [newUserId, 'Alimentação', 'expense', '#ef4444', 'pizza'],
    [newUserId, 'Transporte', 'expense', '#f59e0b', 'car'],
    [newUserId, 'Moradia', 'expense', '#3b82f6', 'home'],
    [newUserId, 'Lazer', 'expense', '#8b5cf6', 'gamepad-2'],
    [newUserId, 'Saúde', 'expense', '#10b981', 'activity'],
    [newUserId, 'Salário', 'income', '#10b981', 'dollar-sign'],
    [newUserId, 'Outros', 'expense', '#64748b', 'more-horizontal']
  ];
  db.transaction((cats) => {
    for (const cat of cats) insertCatStmt.run(...cat);
  })(defaultCategories);

  console.log(`[auth] Novo usuário criado via Google: ${name} <${email}>`);
  return { id: newUserId, name, email, picture };
}

module.exports = { loginWithGoogle };

