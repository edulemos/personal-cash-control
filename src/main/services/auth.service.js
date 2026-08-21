const crypto = require('node:crypto');

// Utilizando scrypt nativo do Node para hash de senhas de forma segura
const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve({
        salt,
        hash: derivedKey.toString('hex')
      });
    });
  });
};

const verifyPassword = (password, hash, salt) => {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      // Evita timing attacks ao comparar
      const result = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey);
      resolve(result);
    });
  });
};

module.exports = { hashPassword, verifyPassword };
