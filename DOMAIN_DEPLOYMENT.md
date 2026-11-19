# Toabapa domain deployment

The repository produces two static frontend builds and one API. Deploy the builds independently:

| Host | Build | Output | Routes |
| --- | --- | --- | --- |
| `toabapa.com` | `npm run build:marketing` | `dist-marketing/` | `/`, `/events`, `/how-it-works`, `/contact`, `/privacy`, `/terms` |
| `app.toabapa.com` | `npm run build` | `dist/` | `/login`, `/dashboard/*`, `/events/:slug`, `/payment/verify` |

Configure both static hosts to serve `index.html` for unknown paths so direct links and refreshes work. The app host must reverse proxy `/api/*` to the backend without changing the path. Keep the backend's webhook and USSD callback URLs pointed to that same `/api` host.

## Production environment

Set these on the **API service**:

```env
APP_URL=https://app.toabapa.com
MARKETING_URL=https://toabapa.com
API_URL=https://app.toabapa.com
```

Set these when building the **app frontend**:

```env
VITE_APP_URL=https://app.toabapa.com
VITE_MARKETING_URL=https://toabapa.com
VITE_API_URL=/
```

Set these when building the **marketing frontend**:

```env
VITE_APP_URL=https://app.toabapa.com
VITE_MARKETING_URL=https://toabapa.com
VITE_PUBLIC_API_URL=https://app.toabapa.com
```

Also set the existing required backend secrets and configuration from `.env.example` on the API service. The `VITE_*` values are embedded at build time; rebuild each frontend when they change. Do not put API secrets in `VITE_*` variables.

The marketing site fetches `/api/v1/public/*` from the app host without cookies. Event cards navigate to the app host for event details and voting. The API permits marketing-origin reads on those public routes only. App login, dashboard requests, payment verification, and the session cookie stay on `app.toabapa.com`.

If the marketing host sets a Content Security Policy, allow `https://app.toabapa.com` in `connect-src` and `img-src` so public event data and banners can load.

## Local development

Run the API with `npm run dev:api`, the app with `npm run dev` on port 5173, and the marketing site with `npm run dev:marketing` on port 5174. The example environment points both frontends at those local addresses.

## Deployment checks

1. Open `https://toabapa.com/events` and confirm cards, banners, and search results load from the app API.
2. Open a marketing event card and confirm it opens `https://app.toabapa.com/events/<slug>`.
3. Open `https://app.toabapa.com/`; sign in as an event administrator and a superadmin. Confirm each sees only permitted dashboard actions.
4. Verify password reset and MFA from the single login page.
5. Complete a test payment and confirm the provider returns to `https://app.toabapa.com/payment/verify`.
6. Confirm a request from `https://toabapa.com` to an authenticated API route is rejected.
