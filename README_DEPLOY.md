
RRnagar Backend — Render deployment ready
========================================

What I changed:
- Added `pg` and `pg-hstore` to package.json so Sequelize can use PostgreSQL.
- Added `render.yaml` for easy deployment on Render.
- `.env.example` updated with DATABASE_URL example.

How to deploy on Render:
1. Create a new Web Service on Render:
   - Connect your GitHub repo (or select "Manual deploy" with this ZIP).
   - Set environment to **Node**.
   - Set the build command to: `npm install`
   - Start command: `npm start`
2. Create a new PostgreSQL database on Render (or use "Managed Postgres"):
   - Note the DATABASE_URL provided by Render.
3. In the Web Service settings, add the environment variable:
   - `DATABASE_URL` = (the value from your Postgres instance)
   - `PORT` = 10000 (Render sets process.env.PORT automatically; optional)
   - `JWT_SECRET` = choose a secret
4. Deploy. The app uses Sequelize with `process.env.DATABASE_URL`. Use migrations in production by running `node scripts/migrate.js` during deployment (the script uses `MIGRATE_ALTER=true` by default).

Local fallback:
- If you don't provide `DATABASE_URL`, the backend will use a local SQLite file (`database.sqlite`) for quick local testing.
- To enable automatic schema sync on startup, set `AUTO_SYNC=true` in your environment (only for development).

5. (Optional) Run `npm run migrate` or `node seed.js` from the shell on Render to seed sample data if desired.

Docker & local production-like stack

1. Start a local Postgres + backend using `docker-compose`:

```bash
docker-compose up --build
```

This composes a Postgres service with a persistent volume and mounts `./uploads` to the container so uploaded files persist locally.

CI / Container registry

- A GitHub Actions workflow `./github/workflows/docker-publish.yml` is provided to build and push the Docker image to GitHub Container Registry (GHCR). The workflow uses the built-in `GITHUB_TOKEN` and will publish `ghcr.io/<owner>/<repo>:latest` on pushes to `main`.

Notes:
- The backend already supports PostgreSQL via `process.env.DATABASE_URL`.
- Make sure CORS in `index.js` allows requests from your GitHub Pages domain (`https://www.rrnagar.com`).
- After deployment, copy the backend URL (e.g., https://rrnagar-backend.onrender.com) and update your frontend API base URL.

Vercel + Supabase deployment notes
---------------------------------

- Vercel serverless functions: this repo exposes the serverless handler at `api/index.js`. The function is exported as the module default to be compatible with Vercel.
- Set the following Environment Variables in the Vercel project settings (Production & Preview):
   - `DATABASE_URL` = Supabase Postgres connection string (use the provided connection string from Supabase). Include `sslmode=require` or set `DB_SSL=true`.
   - `SESSION_SECRET` = a long secret for sessions.
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `AWS_REGION` (if using S3) OR configure Supabase Storage and set `S3_BUCKET` to use Supabase storage base URL and adjust storage code accordingly.
   - `MSG91_AUTH_KEY`, `MSG91_WHATSAPP_FLOW_ID`, SMTP credentials for emails, and other API keys as needed.

- Migrations: Vercel functions don't run startup scripts on deploy. Run migrations in CI or manually against Supabase Postgres. Example (CI): run `node scripts/migrate.js` with `DATABASE_URL` set before deploying.

- SSL/Connections: Supabase requires SSL — ensure `DB_SSL=true` or include `sslmode=require` in `DATABASE_URL`. The app uses `DB_SSL_REJECT_UNAUTHORIZED` to control certificate validation.

- Session store: `connect-pg-simple` is used and will work with Supabase Postgres when `DATABASE_URL` is set.

- File uploads: prefer Supabase Storage or S3 for persisting uploads. The repo includes S3 presign endpoints; for Supabase Storage, replace S3 calls with Supabase Storage API (I can help automate this conversion).

Example CI flow for Vercel + Supabase:

1. In GitHub Actions, before deploying to Vercel (or after build), run migrations:

```yaml
- name: Run migrations
   env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
   run: node scripts/migrate.js
```

2. Deploy to Vercel (use `vercel` CLI or Vercel Git integration). Ensure Vercel project has the same secrets configured.

3. Verify readiness endpoint: `https://<your-vercel-url>/api/ready`.

If you'd like, I can:
- Convert S3 upload code to use Supabase Storage API.
- Add a CI step that runs `node scripts/migrate.js` before deployment to Vercel.
- Add a GitHub Actions step to call Vercel Deploy API with required env vars.

