# IG Studio: the Next.js app in web/ plus the Python tools in skills/.
# Build context is the repo root so both folders are in reach.

FROM node:22-bookworm-slim AS deps
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM deps AS build
COPY web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM python:3.13-slim-bookworm
# The tools are standard-library Python; the standalone Next.js server only
# needs the node binary, so copy it in rather than installing from apt.
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
RUN useradd --create-home --uid 1001 app
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    SKILLS_DIR=/app/skills
COPY skills ./skills
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
