# BIRVANA

BIRVANA is a Next.js 16 music platform with:

- Supabase auth and database
- Cloudflare R2 media storage
- server-side audio processing through `ffmpeg` and `ffprobe`
- protected app routes for discover, library, liked songs, playlists, profile, and studio tools

## Local development

1. Create `.env.local` from `.env.example`.
2. Fill in your Supabase, R2, and SMTP values.
3. Make sure `ffmpeg` and `ffprobe` are installed locally, or point `FFMPEG_PATH` and `FFPROBE_PATH` at the binaries.
4. Install dependencies and start the app:

```bash
npm ci
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Required environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
FFMPEG_PATH=
FFPROBE_PATH=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=birvana.official.in@gmail.com
SMTP_PASS=
SMTP_FROM_EMAIL=birvana.official.in@gmail.com
SMTP_FROM_NAME=BIRVANA
```

For Gmail delivery, create an App Password on the Google account and place it in `SMTP_PASS`. Regular Gmail account passwords will not work with SMTP.

## Recommended production hosting

This project should be hosted as a real Node.js app or Docker container.

Why:

- it uses Next.js route handlers and `proxy`
- it depends on Supabase server auth
- it uploads to Cloudflare R2
- it shells out to `ffmpeg` and `ffprobe` during song upload

The simplest production path is a Docker-based platform such as Render, Railway, Fly.io, DigitalOcean, or your own VPS.

## Docker deployment

This repo is configured with `output: "standalone"` and includes a production `Dockerfile`.

Build and run locally:

```bash
docker build -t birvana .
docker run --env-file .env.local -p 3000:3000 birvana
```

The container installs `ffmpeg`, builds the Next.js app, and runs the standalone server on port `3000`.

## Non-Docker deployment

If you deploy without Docker, the host must provide:

- Node.js 20.9+ for Next.js 16
- `ffmpeg`
- `ffprobe`
- all environment variables listed above

Deployment steps:

```bash
npm ci
npm run build
npm run start
```

Use a reverse proxy such as Nginx or your platform's managed proxy in front of the app.

## Notes on Vercel

Vercel can deploy Next.js projects easily, but this app's upload pipeline depends on local `ffmpeg`/`ffprobe` binaries. In its current form, it is a better fit for container or VM hosting than a basic Vercel deployment.

## Verification

Static verification used in this repo:

```bash
npm run lint
npm run build
```
