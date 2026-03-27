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
# Follow setup instructions in server directory
```

Backend will run on `http://localhost:3000`

See the [server README](./server/README.md) for detailed documentation.

### Frontend

```bash
cd frontend
# Follow setup instructions in frontend directory
```
See the [frontend README](./frontend/README.md) for detailed documentation.

### Seeded test user (frontend login)

After running `npm run seed` in [`server/`](./server/), you can sign in on the frontend with:

| Field    | Value              |
| -------- | ------------------ |
| Email    | `test@example.com` |
| Password | `Password1`        |

(Alice, Bob, and Carol use the same password; the test account has no pre-seeded reviews so you can add your own.)

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
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack React Query
