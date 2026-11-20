import express from 'express';
import helmet from 'helmet';
import path from 'node:path';

const port = Number(process.env.PORT);
const site = process.env.SITE_BUILD;
if (!Number.isInteger(port) || port < 1 || !['app', 'marketing'].includes(site)) {
  throw new Error('Set PORT and SITE_BUILD (app or marketing).');
}

const directory = path.resolve(site === 'marketing' ? 'dist-marketing' : 'dist');
const app = express();
if (site === 'marketing') {
  const apiUrl = process.env.VITE_PUBLIC_API_URL;
  if (!apiUrl) throw new Error('Set VITE_PUBLIC_API_URL for the marketing site.');
  const apiOrigin = new URL(apiUrl).origin;
  const production = process.env.NODE_ENV === 'production';
  if (production && !apiOrigin.startsWith('https://')) {
    throw new Error('VITE_PUBLIC_API_URL must use HTTPS in production.');
  }
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
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
  }));
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
}
app.use(express.static(directory, { index: false }));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(directory, 'index.html')));
app.listen(port, '0.0.0.0');
