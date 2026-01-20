# SQLite Mode

The backend has been switched to SQLite. Prisma datasource now uses provider = "sqlite" and the Electron app will default to a local DB file stored in the Electron userData directory if no `database.url` file is present.

## Connection Resolution Order
1. `DATABASE_URL` environment variable if set.
2. Contents of `%AppData%/medlab-desktop/database.url` (user can override).
3. Fallback: `file:<userData>/medlab.db` (auto-created).

## Schema Deployment
The build script runs `prisma db push` so the SQLite file is created on first run. If you delete the DB file, it will be recreated empty on next launch.

## Seeding
Run manually (development):
```
cd backend
npx prisma db push
npm run db:seed
```
(Adjust seed script to avoid MySQL-specific assumptions.)

## Backups
The SQLite file path (Windows example):
`C:\Users\<User>\AppData\Roaming\medlab-desktop\medlab.db`

Back it up by copying the file while the app is closed.
