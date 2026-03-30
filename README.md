# spark-admin-mongo

MongoDB-backed version of spark-admin. Identical frontend and API surface — only the persistence layer changed.

## Prerequisites

- Node.js 18+
- MongoDB running locally on the default port (`mongodb://localhost:27017`)

**Start MongoDB (if installed as a service):**
```
net start MongoDB
```
Or with mongod directly:
```
mongod --dbpath C:\data\db
```

## Setup

```bash
npm install
node server/seed.js     # seed the database (run once)
npm run dev             # starts Vite :5176 + API :5001
```

## Ports

| Service | Port |
|---------|------|
| Admin UI (Vite) | 5176 |
| API (Express) | 5001 |
| MongoDB | 27017 (default) |

## Differences from spark-admin (in-memory)

| | spark-admin | spark-admin-mongo |
|-|-------------|-------------------|
| Storage | In-memory (resets on restart) | MongoDB (persistent) |
| API port | 5000 | 5001 |
| Vite port | 5173 | 5176 |
| Seed | Hardcoded in data.js | `node server/seed.js` |

## Custom MongoDB URI

```bash
MONGO_URI=mongodb://user:pass@host:27017/mydb node server/index.js
```

## Project structure

```
server/
  db.js       — MongoDB connection (mongoose)
  models.js   — All Mongoose schemas + ID generators + audit helper
  seed.js     — One-time seed script
  index.js    — Express routes (identical API to spark-admin)
src/           — React frontend (identical to spark-admin)
```
