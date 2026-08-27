import http from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { connectSaasDb } from './db/saasDb.js';
import { initSocketManager } from './services/socket.js';

async function bootstrap() {
  try {
    // 1. Connect to Central SaaS Database
    await connectSaasDb();

    // 2. Create HTTP server & Socket.IO server
    const server = http.createServer(app);
    initSocketManager(server);

    server.listen(config.port, () => {
      console.log(`🏨 ORILLUSIVE HMS SaaS API running on http://localhost:${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Central DB: ${config.centralDbName}`);
    });
  } catch (error) {
    console.error('Fatal startup error initializing SaaS platform:', error);
    process.exit(1);
  }
}

bootstrap();
