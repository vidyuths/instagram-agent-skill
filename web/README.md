# IG Studio

A private web front end for the skills in `../skills`. One login, and the
Python tools run on the server exactly as they do from the command line.

Phase 1 (this): instant tools — hook scoring, beat sheets, caption check,
humanizer. No AI calls, no API cost.

## Run locally

```bash
cd web
cp .env.example .env.local   # set APP_PASSWORD and SESSION_SECRET
npm install
npm run dev                  # http://localhost:3000
```

Needs `python3` on your PATH.

## Deploy on Coolify (ig.vidu.click)

1. **DNS:** add an `A` record for `ig` on `vidu.click` pointing at your Coolify server.
2. **Coolify:** New Resource → your GitHub repo `vidyuths/instagram-agent-skill`, branch `main`.
   - Build pack: **Dockerfile**, location `/Dockerfile`, base directory `/`.
   - Port: **3000**.
   - Domain: `https://ig.vidu.click` (Coolify issues the certificate).
3. **Environment variables:**
   - `APP_PASSWORD`: your login password.
   - `SESSION_SECRET`: `openssl rand -base64 48`.
4. Deploy. `/healthz` is the health check path.

Changing `SESSION_SECRET` signs everyone out.
