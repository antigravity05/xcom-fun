# Deployment Guide — xcom.fun

This guide covers deploying xcom.fun to production with Vercel + Neon PostgreSQL + Twitter/X OAuth.

---

## 1. Create the database (Neon — free tier)

1. Go to https://neon.tech and sign up
2. Create a new project (pick the region closest to your users)
3. Copy the **connection string** — it looks like:
   ```
   postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST/YOUR_DB?sslmode=require
   ```
4. Save it — this is your `DATABASE_URL`

## 2. Push the database schema

From your local machine:

```bash
# Clone the repo
git clone <your-repo-url>
cd XCOM.COM

# Install dependencies
npm install

# Set the database URL
export DATABASE_URL="postgresql://...your-neon-url..."

# Push the schema to the database
npm run db:push

# Seed with demo data (optional)
npm run db:seed
```

## 3. Create a Twitter/X Developer App

1. Go to https://developer.x.com/en/portal/dashboard
2. Sign up for a Free or Basic plan
3. Create a new App (or use the default project)
4. Go to **Settings** > **User authentication settings** > **Set up**
5. Configure:
   - **App permissions**: Read and write
   - **Type of App**: Web App
   - **Callback URL**: `https://xcom.fun/api/auth/x/callback`
     (or your Vercel URL like `https://xcom-fun.vercel.app/api/auth/x/callback`)
   - **Website URL**: `https://xcom.fun`
6. Save and copy:
   - **Client ID** → `X_CLIENT_ID`
   - **Client Secret** → `X_CLIENT_SECRET`

## 4. Generate an encryption key

Run this in your terminal:

```bash
openssl rand -hex 32
```

Save the output — this is your `TOKEN_ENCRYPTION_KEY`.

## 5. Deploy to Vercel

1. Go to https://vercel.com and import your GitHub repo
2. In the project settings, add these **Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `X_CLIENT_ID` | From Twitter Developer Portal |
| `X_CLIENT_SECRET` | From Twitter Developer Portal |
| `X_CALLBACK_URL` | `https://your-domain.com/api/auth/x/callback` |
| `TOKEN_ENCRYPTION_KEY` | From `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |

3. Deploy!

## 6. Custom domain (optional)

1. In Vercel project settings > Domains
2. Add `xcom.fun`
3. Update your domain DNS:
   - CNAME `@` → `cname.vercel-dns.com`
   - Or A record → Vercel's IP
4. Don't forget to update `X_CALLBACK_URL` to use the final domain

## Quick reference — npm scripts

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run db:push      # Push schema to database
npm run db:seed      # Seed demo data
npm run db:setup     # Push + seed in one command
npm run db:studio    # Open Drizzle Studio (DB explorer)
```
