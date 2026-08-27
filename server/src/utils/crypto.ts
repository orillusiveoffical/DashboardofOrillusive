import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';

// Convert hex string key to 32-byte Buffer
function getKey(): Buffer {
  const hexKey = config.encryptionKey.padEnd(64, '0').slice(0, 64);
  return Buffer.from(hexKey, 'hex');
}

export interface EncryptedData {
  encryptedText: string;
  iv: string;
  authTag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedText: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decrypt(data: EncryptedData): string {
  const key = getKey();
  const iv = Buffer.from(data.iv, 'hex');
  const authTag = Buffer.from(data.authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(data.encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function maskSecret(secret?: string): string {
  if (!secret) return '';
  if (secret.length <= 6) return '••••••';
  return secret.slice(0, 3) + '••••••••' + secret.slice(-3);
}
