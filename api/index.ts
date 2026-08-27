import app from '../server/src/app.js';
import { connectSaasDb } from '../server/src/db/saasDb.js';

export default async function handler(req: any, res: any) {
  try {
    await connectSaasDb();
  } catch (error) {
    console.error('Database connection error in Vercel handler:', error);
  }
  return app(req, res);
}
