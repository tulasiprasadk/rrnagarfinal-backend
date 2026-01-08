# Security & Hardening Checklist

This file lists immediate hardening and housekeeping steps for the backend repository.

Immediate actions (do these now):

- Revoke any exposed credentials (PATs, Google client secret, DB passwords).
- Rotate leaked secrets and update the new values in Vercel / Supabase immediately.
- Ensure `.env` is listed in `.gitignore` (already present).

Remove secrets from git history (if any were committed):

- Use the BFG or `git filter-repo` to remove secrets from history:
  - BFG example:
    - `bfg --delete-files .env` then follow with `git reflog expire --expire=now --all && git gc --prune=now --aggressive` and force-push to remote.
  - `git filter-repo` is recommended for more complex filters; follow the official docs.

CI hardening

- A GitHub Action `secret-scan` has been added to run a simple pattern-based check on new pushes/PRs. This reduces accidental secret commits by failing CI if patterns are found.

Runtime hardening

- Use Vercel environment variables (do not store secrets in the repo).
- Set `SESSION_SECRET` to a long random value.
- Enable HTTPS-only cookies and other platform security settings.

Monitoring & backups

- Add an uptime monitor (UptimeRobot) and centralized logging (Sentry/LogDNA) for production errors.
- Schedule regular database backups from Supabase and store them securely.

If you want, I can run the history-cleaning commands for you — I will not accept secrets in chat; you must run the remediation commands locally or provide a temporary, revocable mechanism (not recommended).
