# Orillusive Hotel Suite

Production-ready Hotel Management System (HMS) SaaS built with React, TypeScript, Tailwind CSS, TanStack Router, TanStack Query, Node.js, Express, MongoDB, and Prisma.

## Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 19, TypeScript, Tailwind CSS  |
| Routing  | TanStack Router                     |
| Data     | TanStack Query                      |
| Backend  | Node.js, Express, TypeScript        |
| Database | MongoDB, Prisma ORM                 |
| Auth     | JWT with role-based access control  |

## Features

- **Authentication & Roles** — JWT auth with Owner, Manager, and Staff roles
- **Dashboard** — Bookings, occupancy, revenue, check-ins/outs
- **Room Management** — CRUD, types, status, images
- **Booking Management** — Full lifecycle with conflict prevention
- **Availability Calendar** — Monthly grid with room blocking
- **Guest Management** — Profiles, history, notes
- **Admin Panel** — Users, rooms, bookings, settings
- **OTA-ready Architecture** — Integration module stubs for future Booking.com/Airbnb connectors

## Project Structure

```
orillusive-hotel-suite/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── features/       # Feature-specific modules
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities, API client
│       ├── routes/         # TanStack Router pages
│       ├── services/       # API service layer
│       └── types/          # Shared TypeScript types
├── server/                 # Express API
│   ├── prisma/             # Schema, migrations, seed
│   └── src/
│       ├── config/         # Environment & app config
│       ├── lib/            # Prisma client, helpers
│       ├── middleware/     # Auth, error handling, validation
│       ├── modules/        # Domain modules (auth, bookings, etc.)
│       └── types/          # Server-side types
└── package.json            # Workspace root
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB 6+

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
cp .env.example server/.env

# Generate client and push MongoDB schema
npm run db:generate
npm run db:push
npm run db:seed

# Start development servers
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api
- **Prisma Studio:** `npm run db:studio`

### Demo Credentials

| Role    | Email                  | Password    |
| ------- | ---------------------- | ----------- |
| Owner   | owner@orillusive.com   | password123 |
| Manager | manager@orillusive.com | password123 |
| Staff   | staff@orillusive.com   | password123 |

## OTA Integration Architecture

Future OTA integrations (Booking.com, Airbnb) will live under `server/src/modules/integrations/`. Each provider gets its own adapter implementing a shared `OtaProvider` interface. Bookings synced from OTAs use a `source` field and `externalId` for deduplication.

## License

Proprietary — Orillusive Hotel Suite
