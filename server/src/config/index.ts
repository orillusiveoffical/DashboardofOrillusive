import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const defaultMongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoDbUri: defaultMongoUri,
  centralDbName: process.env.CENTRAL_DB_NAME || 'orillusive_hms_saas',
  encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  jwt: {
    secret: process.env.JWT_SECRET || 'orillusive_saas_secure_jwt_secret_key_2026_super_safe',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  safepay: {
    apiKey: process.env.SAFEPAY_API_KEY || process.env.SAFEPAY_PUBLIC_KEY || '',
    secretKey: process.env.SAFEPAY_SECRET_KEY || process.env.SAFEPAY_V1_SECRET || '',
    webhookSecret: process.env.SAFEPAY_WEBHOOK_SECRET || '',
    environment: ((process.env.SAFEPAY_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
    baseUrl: process.env.SAFEPAY_BASE_URL || ((process.env.SAFEPAY_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? 'https://api.getsafepay.com' : 'https://sandbox.api.getsafepay.com'),
    checkoutUrl: process.env.SAFEPAY_CHECKOUT_URL || ((process.env.SAFEPAY_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? 'https://getsafepay.com/components' : 'https://sandbox.api.getsafepay.com/components'),
  },
} as const;
