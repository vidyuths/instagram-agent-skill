# IG Studio

A private web front end for the skills in `../skills`. One login, and the
Python tools run on the server exactly as they do from the command line.

- **Studio:** the skills in `../skills` as a chat, written by Claude. Each
  skill's `SKILL.md` is the system prompt, your voice profile is added, and
  Claude can call the same Python tools as the Tools page (hook scorer, beat
  sheet, caption check, humanizer) and report their real numbers. Replies
  stream; save the good ones to the Library.
- **Slides:** Claude calls `design_slides` and the app draws carousel slides,
  Story frames and Reel covers as PNGs (1080x1350, 1080x1440, 1080x1080 or
  1080x1920) in your brand colours, with a preview, a text editor, per-slide PNG
  and a zip. satori draws the layout, sharp makes the PNG, and the fonts
  (Fraunces and DM Sans, SIL OFL) are in `assets/fonts`.
- **Brand:** your palette, ink and handle. Text colour is picked per background
  by WCAG contrast, and the page shows each ratio. Olive `#929272` takes dark
  text because white on it is only 3.2:1.
- **Calendar:** a month view of planned posts (format, status, date, caption,
  notes, linked slides). Add posts from a Studio reply, from a slide set, or let
  Claude call `add_to_calendar` when you ask it to plan your week.
- **Tools:** the instant checks on their own. No AI, no cost.
- **Library / Voice:** saved drafts, slide sets and your voice profile, in SQLite.

Not here yet: ig-viral (needs live browsing), video, sending to Canva, and
posting to Instagram. The app never posts anything.

## Run locally

```bash
cd web
cp .env.example .env.local   # set APP_PASSWORD and SESSION_SECRET
npm install
npm run dev                  # http://localhost:3000
```

Needs `python3` on your PATH.

## Deploy on Coolify (ig.vidu.click)

The image is built by GitHub Actions (`.github/workflows/docker.yml`) on every
merge to `main` that touches the app, and published to
`ghcr.io/vidyuths/instagram-agent-skill`. Coolify only pulls and runs it, so the
server never has to build Next.js.

1. **DNS:** an `A` record for `ig` on `vidu.click` pointing at your Coolify server.
2. **Image visibility:** after the first workflow run, open the package on
   GitHub (your profile → Packages → instagram-agent-skill → Package settings)
   and set it to **Public**, or give Coolify registry credentials instead.
3. **Coolify:** New Resource → **Docker Image** →
   `ghcr.io/vidyuths/instagram-agent-skill:latest`.
   - Port: **3000**. Domain: `https://ig.vidu.click`.
   - Health check path: `/healthz`.
4. **Environment variables:**
   - `APP_PASSWORD`: your login password.
   - `SESSION_SECRET`: `openssl rand -base64 48`.
   - `ANTHROPIC_API_KEY`: for the Studio. Leave "Build Variable" off.
5. **Storage:** add a persistent volume mounted at `/data`. The voice profile
   and saved drafts live there; without it they are lost on every redeploy.
6. Deploy.

### Redeploy automatically (optional)

Add two repository secrets on GitHub (Settings → Secrets and variables →
Actions) and the workflow tells Coolify to redeploy after each new image:

- `COOLIFY_DEPLOY_URL`: `https://coolify.vidu.click/api/v1/deploy?uuid=<app uuid>&force=false`
  (the app's UUID is in its Coolify URL).
- `COOLIFY_TOKEN`: a Coolify API token with deploy permission.

Without them, press **Redeploy** in Coolify after a new image is published.

Changing `SESSION_SECRET` signs everyone out.
