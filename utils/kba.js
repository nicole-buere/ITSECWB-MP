// utils/kba.js
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const BCRYPT_ROUNDS = 12;
const KBA_PEPPER = process.env.KBA_PEPPER || 'change-me';

function normalizeAnswer(s = '') {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, ''); // strip diacritics
}

// HMAC then bcrypt (defense-in-depth; rotating PEPPER is easier)
function hashAnswer(answer) {
  const norm = normalizeAnswer(answer);
  const hmac = crypto.createHmac('sha256', KBA_PEPPER).update(norm).digest('hex');
  return bcrypt.hash(hmac, BCRYPT_ROUNDS);
}

async function verifyAnswer(answer, storedHash) {
  const norm = normalizeAnswer(answer);
  const hmac = crypto.createHmac('sha256', KBA_PEPPER).update(norm).digest('hex');
  return bcrypt.compare(hmac, storedHash);
}

module.exports = { hashAnswer, verifyAnswer };
