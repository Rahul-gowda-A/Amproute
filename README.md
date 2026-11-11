# AmpRoute - EV Charging & Route Planning Platform

AmpRoute is a production-grade backend service for electric vehicle (EV) route planning, spatial charger discovery, and concurrent charger reservation management. Built with Node.js, Express, TypeScript, PostGIS, and Redis distributed locking.

---

## Architecture Overview

```
                      +-----------------------------+
                      |       Client Requests       |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |     Express.js API Layer    |
                      |  (Zod Input Validation &    |
                      |   OpenAPI / Swagger Docs)   |
                      +--------------+--------------+
                                     |
                     +---------------+---------------+
                     |                               |
                     v                               v
    +--------------------------------+   +------------------------+
    | PostgreSQL 15 + PostGIS Spatial|   | Redis (Distributed    |
    | - ST_DWithin corridor detours  |   |   Locks with TTL and   |
    | - GIST indexing on chargers &  |   |   atomic Lua scripts)  |
    |   stations (chargers_location) |   |                        |
    | - Row-level SELECT FOR UPDATE  |   +------------------------+
    +--------------------------------+
```

---

## Features

1. **Spatial Search & Route Planning (PostGIS)**:
   - Nearby charging stations query via `ST_DWithin` and `ST_Distance` on `GEOGRAPHY(Point, 4326)`.
   - Dynamic route corridor planning via `ST_MakeLine` trajectory with `maxDetourMeters` threshold.
   - Spatial indexing on stations (`idx_stations_location`) and chargers (`chargers_location_idx`).

2. **Distributed Lock & Concurrency Control (Redis + PostgreSQL)**:
   - Multi-layer concurrency protection preventing double reservations.
   - Redis atomic distributed locks (`SET ... NX EX` and Lua CAS atomic deletion).
   - PostgreSQL pessimistic row-level locking (`SELECT ... FOR UPDATE`).
   - Ownership verification on reservation release (`LOCK_NOT_OWNED` protection).

3. **Production Containerization & Deployment**:
   - Multi-stage `Dockerfile` (optimized TypeScript build -> lean production runtime).
   - `docker-compose.yml` orchestrating `app`, `postgres` (PostGIS), and `redis` containers with healthchecks.
   - Dynamic environment configuration supporting Render, Railway, AWS RDS, and Neon.

4. **Interactive OpenAPI / Swagger Documentation**:
   - Interactive Swagger UI served at `/api-docs`.
   - Complete OpenAPI 3.0.0 JSON specification served at `/api-docs.json`.

5. **Automated Testing Suite (Jest & Supertest)**:
   - Integration tests verifying concurrency, lock ownership, spatial accuracy, and Zod input validation.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health status |
| `GET` | `/api-docs` | Interactive Swagger UI API documentation |
| `GET` | `/api-docs.json` | OpenAPI 3.0 specification |
| `GET` | `/api/chargers/nearby` | Spatial search for chargers within radius (meters), sorted by distance |
| `GET` | `/api/stations/nearby` | Search for stations within radius (km) |
| `POST` | `/api/routes/plan` | Plan EV route and find chargers within detour corridor |
| `POST` | `/api/chargers/:id/reserve` | Concurrently reserve a charger with distributed locking |
| `POST` | `/api/chargers/:id/release` | Release a reserved charger with lock ownership verification |

---

## Quickstart with Docker Compose

1. **Clone the repository and prepare environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Start all services**:
   ```bash
   docker compose up --build
   ```

3. **Access services**:
   - Backend API: [http://localhost:3000](http://localhost:3000)
   - Interactive Swagger Docs: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## Running Full-Stack Locally (Backend + React Frontend)

1. **Install dependencies**:
   ```bash
   npm install
   npm --prefix frontend install
   ```

2. **Run both Backend and Frontend concurrently**:
   ```bash
   npm run dev
   ```
   - Frontend UI: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)

3. **Other helpful scripts**:
   - `npm run dev:backend`: Run Express backend with `tsx watch`
   - `npm run dev:frontend`: Run Vite React frontend dev server
   - `npm run build:all`: Compile TypeScript for both backend and frontend
   - `npm run typecheck:all`: Run strict type checking across both projects
   - `npm test`: Run automated Jest & Supertest integration tests

---

## Local Development & Testing

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Apply migrations**:
   ```bash
   npm run migrate
   ```

3. **Seed database (if needed)**:
   ```bash
   npm run seed
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Run test suite**:
   ```bash
   npm test
   ```

6. **Run TypeScript type checks**:
   ```bash
   npm run typecheck
   ```

