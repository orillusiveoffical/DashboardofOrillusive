import app from '../server/dist/app.js';
import { connectSaasDb } from '../server/dist/db/saasDb.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'OPTIONS') {
    try {
      await connectSaasDb();
    } catch (error) {
      console.error('Database connection error in Vercel handler:', error);
    }
  }
  return app(req, res);
}
