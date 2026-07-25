# loop-budget-app

Personal budget tracker. See [`docs/VISION.md`](docs/VISION.md) for the
product vision and scope, and [`docs/ROADMAP.md`](docs/ROADMAP.md) for the
current backlog.

## Stack

- **Client**: React (Vite)
- **Server**: Node/Express
- **Database**: MongoDB (via Mongoose)

```
client/    React app
server/    Express API + MongoDB access
docs/      VISION.md, ROADMAP.md
```

## Prerequisites

- Node.js 18+ and npm
- A MongoDB database to connect to. The simplest option is a free
  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster:
  1. Create a free cluster and a database user (username + password).
  2. Get the connection string (Atlas UI → "Connect" → "Drivers").
  3. Put it in `server/.env` as `MONGODB_URI` (see below) — never commit
     this file or paste the connection string anywhere else.

## Setup

Each package is installed and run independently — there is no root-level
install/dev command.

### Server

```
cd server
npm install
cp .env.example .env   # then fill in MONGODB_URI with your real connection string
npm run dev             # starts the API on http://localhost:3001 (or $PORT)
```

`GET /api/health` returns `{ status: "ok", db: "connected" | "disconnected" }`
reflecting live MongoDB connection state. The server starts even if MongoDB
is unreachable; `db` just reports `"disconnected"`.

### Client

```
cd client
npm install
npm run dev             # starts the Vite dev server, prints the local URL
```

## Testing

Run tests per-package; check each `package.json`'s `scripts` for the
authoritative command.

```
cd server && npm test    # Vitest + Supertest, against an in-memory MongoDB
                          # (mongodb-memory-server) — no real database needed
cd client && npm test     # Vitest + React Testing Library
```
