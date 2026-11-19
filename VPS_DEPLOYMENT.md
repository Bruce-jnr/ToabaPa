# Deploy Toabapa on an Ubuntu VPS

This guide assumes **Ubuntu 24.04**, one VPS, Nginx, Node.js 22, and PostgreSQL (on the VPS or managed elsewhere). It serves the marketing site at `https://toabapa.com`, the application at `https://app.toabapa.com`, and the API behind `https://app.toabapa.com/api/`. Run commands on the VPS unless a step says otherwise. Replace `YOUR_LINUX_USER` and the repository URL with your values.

The repository currently builds two separate static sites: `dist-marketing/` and `dist/`. The API runs from `dist-api/`. Vite 8 requires Node.js 20.19+ or 22.12+; this guide uses Node.js 22. [Vite requirements](https://vite.dev/guide/)

## 1. Prepare DNS and the VPS

Create DNS `A` records for `toabapa.com` and `app.toabapa.com` pointing to the VPS public IP. If you publish `AAAA` records, ensure IPv6 also reaches this VPS. Wait for both names to resolve before requesting certificates.

Sign in over SSH as a **non-root** user with sudo access. Install Nginx, PostgreSQL (skip PostgreSQL if using a managed database), and basic tools:

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-client git curl ca-certificates snapd
```

Install Node.js 22 using the [NodeSource Ubuntu instructions](https://github.com/nodesource/distributions/blob/master/DEV_README.md). Review the downloaded setup script before running it:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
less /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node --version
npm --version
```

Allow SSH **before** enabling the firewall, then open web traffic. Use your actual SSH port if it differs from 22. Do not open ports 4000 or 5432 to the internet. [Ubuntu firewall guide](https://ubuntu.com/server/docs/firewalls/)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 2. Create the database

For a local PostgreSQL installation, create a dedicated database and user. `createuser` prompts you for the database password:

```bash
sudo -u postgres createuser --pwprompt toabapa
sudo -u postgres createdb --owner=toabapa toabapa
```

Use this shape for `DATABASE_URL`; percent-encode special characters in the password:

```text
postgresql://toabapa:URL_ENCODED_PASSWORD@127.0.0.1:5432/toabapa?schema=public
```

If using managed PostgreSQL, use its connection string and TLS requirements instead. Keep the database reachable from the API server only. Set up automated database backups and verify that a backup can be restored before taking real votes.

## 3. Check out the code and set production configuration

The following uses your SSH login user as the deployment and `systemd` service user. Keep the repo outside Nginx's web roots; Nginx will serve only the two build output directories.

```bash
sudo install -d -o "$USER" -g "$USER" /srv/toabapa
git clone YOUR_REPOSITORY_URL /srv/toabapa/app
cd /srv/toabapa/app
npm ci
npm run db:generate
```

Create a private `.env` in `/srv/toabapa/app`. Start from `.env.example`, then replace **every placeholder** used in production. Do not commit `.env` or put secrets in `VITE_*` settings:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

These values are required for this layout:

```env
NODE_ENV=production
API_PORT=4000
TRUST_PROXY_HOPS=1
DATABASE_URL=postgresql://toabapa:URL_ENCODED_PASSWORD@127.0.0.1:5432/toabapa?schema=public
APP_URL=https://app.toabapa.com
MARKETING_URL=https://toabapa.com
API_URL=https://app.toabapa.com
VITE_API_URL=/
VITE_PUBLIC_API_URL=https://app.toabapa.com
VITE_APP_URL=https://app.toabapa.com
VITE_MARKETING_URL=https://toabapa.com
LOG_LEVEL=error
SESSION_SECRET=REPLACE_WITH_A_RANDOM_SECRET
```

Generate a random session secret with `openssl rand -hex 32`. Also configure AWS S3, live Paystack keys, Arkesel OTP, Nalo USSD, worker intervals, and Telegram settings from `.env.example`. In production the API refuses to start without the required live provider settings. If Telegram alerts are enabled, provide its token and chat ID. The `VITE_*` values are embedded in the frontend at **build time**; rebuild both sites when they change. [Vite environment documentation](https://vite.dev/guide/env-and-mode)

`APP_URL` must be the **app** origin. It is used for payment return URLs and the API's authenticated request origin check. `MARKETING_URL` allows the marketing site to read public event data. Set `TRUST_PROXY_HOPS=1` only when Nginx is the single trusted proxy between clients and the Node process. If you add a CDN or another proxy, review the forwarded-IP configuration before changing this value.

## 4. Build and migrate

```bash
cd /srv/toabapa/app
npm run build:api
npm run build
npm run build:marketing
npm run db:deploy
```

`db:deploy` applies the checked-in Prisma migrations. **Do not use `db:migrate` or `db push` on production.** Prisma documents `migrate deploy` for production deployment. [Prisma migration guide](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)

**Do not run `npm run db:seed` on production.** This repository's seed script creates demo awards, candidates, and a demo paid vote. If you are moving an existing database, migrate that database and keep its real administrator account. For a genuinely empty database, use the one-time bootstrap below.

### One-time superadmin bootstrap for an empty database

Run this only after migrations, and only when the `User` table is empty. It asks for an email and password without writing the password into shell history. The script refuses to run if any user already exists.

```bash
cd /srv/toabapa/app
read -rp 'Superadmin email: ' BOOTSTRAP_EMAIL
read -rsp 'Superadmin password: ' BOOTSTRAP_PASSWORD; echo
export BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
node --input-type=module <<'NODE'
import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_PASSWORD;
if (!email || !password || password.length < 10) throw new Error('Provide an email and a password of at least 10 characters.');
try {
  if (await db.user.count()) throw new Error('Users already exist; stop and use the existing administrator account.');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name: 'Toabapa', slug: 'toabapa', email, status: 'ACTIVE' } });
    const user = await tx.user.create({ data: { email, name: 'Toabapa Superadmin', passwordHash, globalRole: 'SUPER_ADMIN' } });
    await tx.organizationMembership.create({ data: { organizationId: organization.id, userId: user.id, role: 'ORGANIZATION_OWNER', status: 'ACTIVE' } });
  });
  console.log('Superadmin created. Sign in with the email and password entered above.');
} finally {
  await db.$disconnect();
}
NODE
unset BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
```

## 5. Run the API with systemd

Create `/etc/systemd/system/toabapa-api.service`. Replace `YOUR_LINUX_USER` with the user who owns `/srv/toabapa/app`. Check `which node`; use that absolute path if it differs from `/usr/bin/node`.

```ini
[Unit]
Description=Toabapa API
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=YOUR_LINUX_USER
Group=YOUR_LINUX_USER
WorkingDirectory=/srv/toabapa/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /srv/toabapa/app/dist-api/server/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

Start it and check the local health endpoints:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now toabapa-api
sudo systemctl status toabapa-api --no-pager
curl --fail http://127.0.0.1:4000/api/health/live
curl --fail http://127.0.0.1:4000/api/health/ready
```

If it fails, inspect `sudo journalctl -u toabapa-api -n 100 --no-pager`. `live` checks the process; `ready` also checks database connectivity.

## 6. Configure Nginx for both domains

Create `/etc/nginx/sites-available/toabapa` with the following HTTP configuration. The app's `proxy_pass` intentionally has **no trailing slash**, so Nginx passes `/api/...` to Express without changing the path. [Nginx proxy documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

```nginx
server {
    listen 80;
    server_name toabapa.com;
    root /srv/toabapa/app/dist-marketing;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name app.toabapa.com;
    root /srv/toabapa/app/dist;
    index index.html;

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`try_files` lets browser refreshes and direct links reach the React routers. [Nginx `try_files` reference](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)

```bash
sudo ln -s /etc/nginx/sites-available/toabapa /etc/nginx/sites-enabled/toabapa
sudo nginx -t
sudo systemctl reload nginx
```

If the default Nginx site is still enabled, disable it only after checking the new site works; do not remove another site's configuration by accident.

## 7. Enable HTTPS

With DNS pointing to the VPS and port 80 reachable, install Certbot and have its Nginx plugin obtain and install certificates for both names:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d toabapa.com -d app.toabapa.com
sudo certbot renew --dry-run
sudo nginx -t
```

Follow the HTTPS redirect prompt. Certbot's Nginx plugin edits the Nginx configuration; keep a copy of your original file before running it. [Certbot instructions](https://certbot.eff.org/instructions?os=snap&ws=nginx)

## 8. Configure external callbacks and verify

- Paystack webhook: `https://app.toabapa.com/api/webhooks/paystack`.
- Nalo USSD callback: `https://app.toabapa.com/api/v1/ussd/nalo`. Configure the secret header if Nalo supports it, or use the callback token method documented in `.env.example`.
- Payment return: the API sends users to `https://app.toabapa.com/payment/verify`.
- AWS S3: the bucket can remain private; the API serves uploaded images through its public image routes.

Run these checks after HTTPS is active:

```bash
curl --fail https://app.toabapa.com/api/health/live
curl --fail https://app.toabapa.com/api/health/ready
curl --fail https://toabapa.com/
curl --fail https://app.toabapa.com/
curl -i -H 'Origin: https://toabapa.com' 'https://app.toabapa.com/api/v1/public/events?status=live'
```

Then use a browser to confirm marketing event cards and banners load, a card opens the app event page, login works for each role, and a test payment returns to the app verification page. The public API response should allow the marketing origin without credentialed CORS. Authenticated write requests from the marketing origin should be rejected.

## 9. Update the VPS later

Back up the database before schema changes. From the repo directory, run:

```bash
cd /srv/toabapa/app
git pull --ff-only
npm ci
npm run db:generate
npm run build:api
npm run build
npm run build:marketing
npm run db:deploy
sudo systemctl restart toabapa-api
curl --fail https://app.toabapa.com/api/health/ready
```

Run `sudo nginx -t && sudo systemctl reload nginx` only when the Nginx configuration changes. Keep the production `.env` on the VPS and out of Git. For a release that includes incompatible database changes, plan a maintenance window and a tested restore path before running migrations.
