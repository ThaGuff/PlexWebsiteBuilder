# 🐸 WebHop — AI Website Builder

> Premium AI-powered website builder that turns any business description or existing URL into a fully customized, SEO-optimized WordPress website — delivered end-to-end.

Built by **PLEX Automation** · Birmingham/Huntsville, Alabama

## What WebHop Does

Two modes:

1. **URL Import** — scrapes an existing business website, extracts brand colors, fonts, content, and rebuilds it as a premium WordPress site  
2. **Business Description** — takes business info and generates a complete website with custom branding from scratch

Output: fully configured WordPress site with custom theme, AI-written content, SEO package, schema markup, sitemap, plugins, navigation, contact forms.

## Architecture

```
webhop/
├── apps/
│   ├── frontend/          # React 18 + Vite + TypeScript + Tailwind
│   └── backend/           # Node 22 + Express + TypeScript
├── wordpress-engine/      # PHP 8.2 + WordPress 7.0 + WebHop theme
├── docker/                # Production Dockerfiles
├── docker-compose.yml     # Full local dev stack
└── railway.json           # Railway deployment config
```

## Quick Start

```bash
git clone https://github.com/ThaGuff/PlexWebsiteBuilder.git
cd PlexWebsiteBuilder
cp .env.example .env
# Set ANTHROPIC_API_KEY and JWT_SECRET in .env
docker compose up -d
cd apps/frontend && npm install && npm run dev
# App at http://localhost:3000
```

## Railway Deployment

1. Create PostgreSQL plugin in Railway project
2. Deploy backend using `docker/Dockerfile.backend`
3. Deploy WordPress using `wordpress-engine/Dockerfile`  
4. Set environment variables (see `.env.example`)

See README for full deployment guide.

---
PLEX Automation © 2026
