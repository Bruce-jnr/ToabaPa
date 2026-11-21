# Getting the marketing site into Google Search

The marketing site is served at `https://toabapa.com`. Its deployable build now has route-specific titles, descriptions, canonical URLs, `robots.txt`, and `sitemap.xml`. The two crawl files are generated into `dist-marketing` by `npm run build:marketing` from [frontend/marketing-seo.js](frontend/marketing-seo.js). The sitemap lists the home, events, how-it-works, contact, privacy, and terms pages. Sample event pages are marked `noindex` and are not in the sitemap. Login and dashboard pages live on `app.toabapa.com` and are not listed in the marketing sitemap.

## After deploying

1. Confirm `VITE_MARKETING_URL=https://toabapa.com` on the Railway Marketing service, then deploy the latest build and server code.
2. Open `https://toabapa.com/robots.txt` and `https://toabapa.com/sitemap.xml`. Both should respond successfully and use the final domain.
3. Open the six sitemap URLs directly. Check that each returns HTTP 200 and has a matching title, description, and canonical URL in **View Source**. An unknown URL should return 404.
4. In [Google Search Console](https://search.google.com/search-console/), add a **Domain property** for `toabapa.com`. Add the DNS TXT verification record Google gives you at your DNS provider and complete verification. This covers the apex and subdomains. If you use a URL-prefix property instead, verify the exact `https://toabapa.com/` address.
5. In Search Console's **Sitemaps** section, submit `https://toabapa.com/sitemap.xml`. Use **URL Inspection** for the home page and `/events`, run a live test, then request indexing if the rendered content is correct.
6. Monitor **Page indexing** and **URL Inspection** for crawl, render, or canonical problems. Allow time for discovery; a submitted sitemap and an indexing request do not guarantee inclusion or ranking.

If Search Console reports a 404 for the sitemap, open its exact URL in a browser. The Marketing service must build with `npm run build:marketing` and deploy the commit containing `frontend/marketing-seo.js`; its build output must contain `dist-marketing/sitemap.xml`. The Railway Marketing service's start command is `node frontend/serve-static.mjs`. Confirm the custom domain points to that service. This repository also has a root `railway.json` for the API; Railway may apply its API start command to the Marketing service because config-as-code overrides dashboard values. If so, set the Marketing service's **Config File** path to `/frontend/railway.marketing.json` and check the deployment's effective settings. After redeploying, resubmit the sitemap in Search Console; a previous failed fetch may remain visible until Google retries.

Google can render this React marketing site, but its initial HTML does not contain the event list. Public event data is fetched from `app.toabapa.com` during rendering. Keep that API publicly reachable for read requests and verify the rendered page in Search Console. If event listings do not render reliably for Google, add server rendering or pre-rendered event HTML as a separate improvement.

Use the apex domain consistently in links and canonical URLs. If `www.toabapa.com` is also configured, redirect it to `https://toabapa.com` to avoid duplicate page URLs.
