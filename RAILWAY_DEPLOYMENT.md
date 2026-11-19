# Deploy Toabapa on Railway

Deploy this monorepo as **three services in one Railway project**: PostgreSQL, **App + API**, and **Marketing**. The app and API share `app.toabapa.com`, so login cookies and `/api` requests remain on one origin. The marketing site uses `toabapa.com` and reads public events from the app API. Railway supports separate services from one repository with distinct build and start commands ([monorepo guide](https://docs.railway.com/deployments/monorepo)).

## 1. Prepare the repository

Commit the application and this guide. Do not commit `.env`. Push the branch you intend Railway to deploy. In Railway, create a project, add PostgreSQL, then add two GitHub services from this repository. Keep the root directory at the repository root for both GitHub services.

Set each service's build and start commands in its Railway settings ([build and start commands](https://docs.railway.com/builds/build-and-start-commands)):

| Service | Build command | Pre-deploy command | Start command | Healthcheck path |
| --- | --- | --- | --- | --- |
| App + API | `npm run db:generate && npm run build:api && npm run build` | `npm run db:deploy` | `npm run start:api` | `/api/health/ready` |
| Marketing | `npm run build:marketing` | None | `node frontend/serve-static.mjs` | `/` |

The app build is served by Express in production. Its SPA fallback handles direct visits to app routes while `/api/*` stays with the API. The marketing server serves `dist-marketing` and supports direct visits to its routes.

## 2. Set environment variables

**Railway build requirement:** Add the `VITE_*` variables to the same Railway service that runs each Vite build, before triggering deployment. In particular, the **App + API** service must have `VITE_APP_URL`, `VITE_MARKETING_URL`, and `VITE_API_URL`. Railway does not read your local `.env`, and variables configured only on the Marketing service are not available to the App + API build. After saving variables, redeploy the service from the Railway dashboard. If the build still says a variable is missing, check the selected Railway environment and service, and make sure the variable is available during the build rather than only at runtime.

On **App + API**, set these values. Use Railway's variable picker for the PostgreSQL reference; replace `Postgres` below if you named that service differently ([PostgreSQL service](https://docs.railway.com/databases/postgresql)).

```env
NODE_ENV=production
PORT=4000
API_PORT=4000
TRUST_PROXY_HOPS=1
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://app.toabapa.com
MARKETING_URL=https://toabapa.com
API_URL=https://app.toabapa.com
VITE_API_URL=/
VITE_APP_URL=https://app.toabapa.com
VITE_MARKETING_URL=https://toabapa.com
LOG_LEVEL=error
```

Set `PORT` and `API_PORT` to the same value because Railway routes traffic to `PORT`, while this server listens on `API_PORT` ([healthcheck and port documentation](https://docs.railway.com/deployments/healthchecks)). Set `TRUST_PROXY_HOPS` to the actual number of trusted proxies in front of Express; use `1` for Railway's direct proxy. Do not blindly increase it because rate limits use the resolved client address.

Also add every required production setting from [`.env.example`](.env.example): a unique `SESSION_SECRET` of at least 32 characters, AWS S3 region/bucket/access keys, Paystack live keys and webhook secret, Arkesel OTP settings, Nalo USSD secret, webhook retry interval, and Telegram alert settings. Set `TELEGRAM_ALERTS_ENABLED=false` until the bot credentials are ready. The API validates required settings on startup. Keep secrets in Railway variables; never prefix secrets with `VITE_`.

On **Marketing**, set:

```env
SITE_BUILD=marketing
VITE_APP_URL=https://app.toabapa.com
VITE_MARKETING_URL=https://toabapa.com
VITE_PUBLIC_API_URL=https://app.toabapa.com
```

Railway supplies the marketing service's `PORT`; `frontend/serve-static.mjs` reads it. Frontend `VITE_*` values are compiled into each build, so redeploy the relevant service after changing them ([Vite environment guide](https://vite.dev/guide/env-and-mode)).

## 3. Run database migrations

In the **App + API** service, open **Settings → Deploy → Pre-deploy Command** and enter `npm run db:deploy`. Save the setting and redeploy. Railway runs this command after building and before starting the new application, with the service's variables and private database access. A failed migration stops the deployment ([Railway pre-deploy documentation](https://docs.railway.com/deployments/pre-deploy-command)). Prisma's script applies the committed migrations to the database selected by `DATABASE_URL` ([Prisma deployment guide](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)).

If the running service reports `The table public.AuditLog does not exist` or similar errors for `Payment`, `AuthSession`, or `AlertOutbox`, the connected database has not received the migrations. Confirm `DATABASE_URL` references the intended PostgreSQL service and schema, then check the **pre-deploy logs** for migration success before restarting the app. Do not use `prisma db push` or seed data to work around a failed migration. The existing application may continue producing worker errors until the migrated deployment becomes active.

Do **not** run `npm run db:seed` in production; it inserts demo data and a demo paid vote. For an empty database, use the one-time superadmin bootstrap in [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md#one-time-superadmin-bootstrap-for-an-empty-database) in a secure environment that can reach the Railway database. For an existing database, preserve its real superadmin account and back up the data before migration.

## 4. Connect domains

In Railway Public Networking, add `app.toabapa.com` to **App + API** and `toabapa.com` to **Marketing**. Create the DNS records Railway displays and wait for domain verification and TLS issuance ([custom domain guide](https://docs.railway.com/networking/domains/working-with-domains)). Do not expose PostgreSQL publicly.

Configure external providers with the app domain:

- Paystack webhook: `https://app.toabapa.com/api/webhooks/paystack`.
- Nalo USSD callback: `https://app.toabapa.com/api/v1/ussd/nalo?token=<NALO_USSD_SECRET>` if Nalo cannot send the secret in a header. Prefer the configured secret header when supported.
- Payment return URL: `https://app.toabapa.com/payment/verify`.

Verify the exact provider callback requirements in their dashboards before enabling live traffic.

## 5. Check the release

1. Open `https://app.toabapa.com/api/health/ready`; it should report database readiness.
2. Open `https://app.toabapa.com/login` directly and refresh it; the app should load without a 404.
3. Open `https://toabapa.com` and confirm events and images load from `app.toabapa.com`.
4. Sign in as an organizer and a superadmin, navigate and refresh, then log out and confirm protected routes require a new login.
5. Test an event, checkout, Paystack webhook, Nalo callback, image upload, and Telegram alert with provider test facilities before using live payments.

Keep Railway deployment logs and API error logs available during the first release. The marketing origin is authorized only for public API reads; authenticated writes remain on the app origin.
