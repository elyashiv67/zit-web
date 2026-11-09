import bcrypt from 'bcrypt';

// bcrypt work factor: each +1 doubles the time a password guess costs (12 ≈ 0.2–0.3s per hash).
// Hashes made with a lower cost still work, and are re-hashed on the user's next login.
const BCRYPT_ROUNDS = 12;

// bcrypt only reads the first 72 bytes, so the schemas cap passwords there (a Hebrew letter is 2 bytes)
const MAX_PASSWORD_BYTES = 72;

const hashPassword = plain => bcrypt.hash(plain, BCRYPT_ROUNDS);

const needsRehash = hash => bcrypt.getRounds(hash) < BCRYPT_ROUNDS;

export {BCRYPT_ROUNDS, MAX_PASSWORD_BYTES, hashPassword, needsRehash};
