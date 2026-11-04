import crypto from 'crypto';
import env from './env.js';

// encrypts values stored in the DB (DVR passwords) with AES-256-GCM, so a DB dump or backup
// doesn't reveal them. GCM also detects tampering. Format: v1:<iv>:<auth tag>:<ciphertext>
// Losing DVR_SECRET means losing the stored values — back it up with the other secrets.
const KEY = crypto.createHash('sha256').update(env.DVR_SECRET).digest();
const PREFIX = 'v1:';

function encrypt(text) {
    if (text === undefined || text === null) return text;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
    return PREFIX + [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join(':');
}

function decrypt(stored) {
    // values saved before encryption was added are returned as they are
    if (typeof stored !== 'string' || !stored.startsWith(PREFIX)) return stored;
    const [iv, tag, data] = stored.slice(PREFIX.length).split(':').map(s => Buffer.from(s, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export {encrypt, decrypt};
