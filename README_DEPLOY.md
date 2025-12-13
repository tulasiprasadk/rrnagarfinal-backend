
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
4. Deploy. The app uses Sequelize with `process.env.DATABASE_URL` and will create tables automatically on first run (sequelize.sync()).
5. (Optional) Run `npm run migrate` or `node seed.js` from the shell on Render to seed sample data if desired.

Notes:
- The backend already supports PostgreSQL via `process.env.DATABASE_URL`.
- Make sure CORS in `index.js` allows requests from your GitHub Pages domain (`https://www.rrnagar.com`).
- After deployment, copy the backend URL (e.g., https://rrnagar-backend.onrender.com) and update your frontend API base URL.

