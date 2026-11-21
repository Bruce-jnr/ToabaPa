import express from 'express';
import helmet from 'helmet';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { marketingPages } from './marketing-seo.js';

const port = Number(process.env.PORT);
const site = process.env.SITE_BUILD;
if (
  !Number.isInteger(port) ||
  port < 1 ||
  !['app', 'marketing'].includes(site)
) {
  throw new Error('Set PORT and SITE_BUILD (app or marketing).');
}

const directory = path.resolve(
  site === 'marketing' ? 'dist-marketing' : 'dist',
);
const app = express();
let marketingOrigin;
if (site === 'marketing') {
  const apiUrl = process.env.VITE_PUBLIC_API_URL;
  const marketingUrl = process.env.VITE_MARKETING_URL;
  if (!apiUrl || !marketingUrl)
    throw new Error(
      'Set VITE_PUBLIC_API_URL and VITE_MARKETING_URL for the marketing site.',
    );
  const apiOrigin = new URL(apiUrl).origin;
  marketingOrigin = new URL(marketingUrl).origin;
  const production = process.env.NODE_ENV === 'production';
  if (
    production &&
    (!apiOrigin.startsWith('https://') ||
      !marketingOrigin.startsWith('https://'))
  ) {
    throw new Error(
      'VITE_PUBLIC_API_URL and VITE_MARKETING_URL must use HTTPS in production.',
    );
  }
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            'https://fonts.googleapis.com',
            "'unsafe-inline'",
          ],
          styleSrcAttr: ["'unsafe-inline'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', apiOrigin],
          connectSrc: ["'self'", apiOrigin],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: production ? [] : null,
        },
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: production
        ? { maxAge: 31_536_000, includeSubDomains: false, preload: false }
        : false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    next();
  });
}
app.use(express.static(directory, { index: false }));
if (site === 'marketing') {
  const template = readFileSync(path.join(directory, 'index.html'), 'utf8');
  app.get('/{*path}', (req, res) => {
    const route = req.path.length > 1 ? req.path.replace(/\/$/, '') : req.path;
    const isDemo = route.startsWith('/demo/events/');
    const page = marketingPages[route];
    if (!page && !isDemo)
      return res.status(404).type('text/plain').send('Page not found');
    const [title, description] = page || [
      'Sample Event | Toabapa',
      'An illustrative event interface example on Toabapa.',
    ];
    const canonical = `${marketingOrigin}${page ? route : '/events'}`;
    const html = template
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(
        /(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/,
        `$1${description}$2`,
      )
      .replace(
        /(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/,
        `$1${title}$2`,
      )
      .replace(
        /(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/,
        `$1${description}$2`,
      )
      .replace(
        '</head>',
        `<link rel="canonical" href="${canonical}" />\n    <meta name="robots" content="${isDemo ? 'noindex, follow' : 'index, follow'}" />\n  </head>`,
      );
    return res.type('html').send(html);
  });
} else {
  app.get('/{*path}', (_req, res) =>
    res.sendFile(path.join(directory, 'index.html')),
  );
}
app.listen(port, '0.0.0.0');
