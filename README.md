# BusMate (Next.js App Router)

BusMate is now migrated to Next.js (App Router) with TypeScript, Tailwind CSS, and Leaflet maps.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS with CSS variables in `app/globals.css`
- Framer Motion animations
- Leaflet + React-Leaflet (OpenStreetMap tiles)
- MongoDB Atlas and Firebase-ready route handlers/env wiring

## Run locally

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_*` Firebase and websocket vars
- `MONGODB_URI`
- `MONGODB_DB_NAME`

## Key routes

- `/` landing page
- `/login` role-based login
- `/student`, `/driver`, `/admin` role portals
- `/api/health` setup check
- `/api/routes` Mongo-backed route list
