# CloudTalk

A product review system built with a NestJS backend and React frontend.

## Project Structure

This is a monorepo containing two main components:

- **[`server/`](./server/)** - Backend API built with NestJS, TypeScript, Prisma, and PostgreSQL
- **[`frontend/`](./frontend/)** - Frontend application

## Quick Start

### Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your configuration (generate JWT_SECRET)
docker-compose up -d  # Start PostgreSQL
npx prisma migrate dev
npm run seed
npm run start:dev
```

Backend will run on `http://localhost:3000`

See the [server README](./server/README.md) for detailed documentation.

### Frontend

```bash
cd frontend
# Follow setup instructions in frontend directory
```

## Documentation

- Backend Architecture & API: See [`server/README.md`](./server/README.md)
- Frontend: See [`frontend/README.md`](./frontend/README.md)

## Development

Each directory contains its own `package.json` and can be developed independently.

## Tech Stack

### Backend
- NestJS + TypeScript
- Prisma ORM
- PostgreSQL (production) / SQLite (local)
- JWT Authentication
- Zod Validation
- Pino Logging

### Frontend
- (See frontend directory)
