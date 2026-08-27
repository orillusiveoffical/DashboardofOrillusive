import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import roomsRoutes from './modules/rooms/rooms.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import guestsRoutes from './modules/guests/guests.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import calendarRoutes from './modules/calendar/calendar.routes.js';
import integrationsRoutes from './modules/integrations/integrations.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import housekeepingRoutes from './modules/housekeeping/housekeeping.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import subscriptionRoutes from './modules/subscription/subscription.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';

const app = express();

const allowedOrigins = [
  'https://dashboard.orillusive.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

if (config.clientUrl) {
  const cleanClientUrl = config.clientUrl.replace(/\/+$/, '');
  if (cleanClientUrl && !allowedOrigins.includes(cleanClientUrl)) {
    allowedOrigins.push(cleanClientUrl);
  }
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const cleanOrigin = origin.replace(/\/+$/, '').toLowerCase();
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.toLowerCase() === cleanOrigin
    );
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin'
      );
    }
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '').toLowerCase();
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.toLowerCase() === cleanOrigin
    );
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Orillusive HMS SaaS API is running',
    environment: config.nodeEnv,
    centralDb: config.centralDbName,
  });
});

app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/rooms', '/rooms'], roomsRoutes);
app.use(['/api/bookings', '/bookings'], bookingsRoutes);
app.use(['/api/guests', '/guests'], guestsRoutes);
app.use(['/api/dashboard', '/dashboard'], dashboardRoutes);
app.use(['/api/calendar', '/calendar'], calendarRoutes);
app.use(['/api/integrations', '/integrations'], integrationsRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/public', '/public'], publicRoutes);
app.use(['/api/housekeeping', '/housekeeping'], housekeepingRoutes);
app.use(['/api/availability', '/availability'], availabilityRoutes);
app.use(['/api/reports', '/reports'], reportsRoutes);
app.use(['/api/staff', '/staff'], staffRoutes);
app.use(['/api/notifications', '/notifications'], notificationsRoutes);
app.use(['/api/subscription', '/subscription'], subscriptionRoutes);
app.use(['/api/settings', '/settings'], settingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
