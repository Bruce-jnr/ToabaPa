import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { RequestHandler } from 'express';
import path from 'node:path';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { organizerRouter } from './routes/organizer.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { voteOrdersRouter } from './routes/vote-orders.routes.js';
import { ussdRouter } from './routes/ussd.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';
import {
  apiRateLimit,
  rateLimitKeyFromBody,
  rateLimitPhoneKeyFromBody,
} from './middleware/rate-limit.js';
import { financialRouter } from './routes/financial.routes.js';
import { strictTransportSecurity } from './security/http-headers.js';
import { getImage, type ImageKind } from './storage/image-storage.js';

function serveStoredImage(kind: ImageKind): RequestHandler {
  return async (req, res, next) => {
    const filename = req.params.filename;
    if (typeof filename !== 'string') return next();
    try {
      const image = await getImage(kind, filename);
      if (!image) return next();
      res.type(image.contentType).set('Cache-Control', 'public, max-age=86400').send(image.data);
    } catch (error) { next(error); }
  };
}

export const app = express();

app.disable('x-powered-by');
// This must be configured before logging and rate limiting so Express resolves
// the client address consistently for every route.
if (env.TRUST_PROXY_HOPS > 0) app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(
  pinoHttp({
    logger,
    customLogLevel(_req, res, error) {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return env.NODE_ENV === 'development' ? 'debug' : 'info';
    },
    serializers: {
      req(req) {
        const url = new URL(req.url || '/', 'http://localhost');
        if (url.searchParams.has('token'))
          url.searchParams.set('token', '[REDACTED]');
        return {
          id: req.id,
          method: req.method,
          url: `${url.pathname}${url.search}`,
          remoteAddress: req.remoteAddress,
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(
  helmet({ strictTransportSecurity: strictTransportSecurity(env.NODE_ENV) }),
);
app.use(cors((req, next) => {
  const marketingPublicRead = req.header('origin') === env.MARKETING_URL &&
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.path.startsWith('/api/v1/public/');
  next(null, marketingPublicRead
    ? { origin: env.MARKETING_URL, credentials: false }
    : { origin: env.APP_URL, credentials: true });
}));
app.use(
  '/api/webhooks',
  apiRateLimit({ windowMs: 60_000, limit: 120 }),
  express.raw({ type: 'application/json', limit: '250kb' }),
  webhookRouter,
);
app.use(
  '/api/v1/ussd',
  apiRateLimit({ windowMs: 60_000, limit: 60 }),
  ussdRouter,
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api/v1', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.header('origin') || req.header('origin') === env.APP_URL) {
    next();
    return;
  }
  res.status(403).json({ success: false, error: { code: 'INVALID_REQUEST_ORIGIN', message: 'Request origin was rejected.' } });
});

app.use('/api', apiRateLimit({ windowMs: 60_000, limit: 120 }));
app.use('/api/health', healthRouter);
const authRateLimitHandler = (_req: express.Request, res: express.Response) =>
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please wait before trying again.',
    },
  });
app.use(
  '/api/v1/auth/login',
  apiRateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: rateLimitKeyFromBody('identifier'),
    handler: authRateLimitHandler,
  }),
  apiRateLimit({
    windowMs: 60 * 60_000,
    limit: 50,
    skipSuccessfulRequests: true,
    keyGenerator: rateLimitKeyFromBody('identifier', false),
    handler: authRateLimitHandler,
  }),
);
app.use(
  '/api/v1/auth/password-reset/request',
  apiRateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    keyGenerator: rateLimitKeyFromBody('email'),
    handler: authRateLimitHandler,
  }),
  apiRateLimit({
    windowMs: 60 * 60_000,
    limit: 20,
    keyGenerator: rateLimitKeyFromBody('email', false),
    handler: authRateLimitHandler,
  }),
);
app.use(
  '/api/v1/auth/password-reset/confirm',
  apiRateLimit({
    windowMs: 15 * 60_000,
    limit: 8,
    handler: authRateLimitHandler,
  }),
);
app.use(
  '/api/v1/auth/mfa/setup',
  apiRateLimit({
    windowMs: 15 * 60_000,
    limit: 3,
    handler: authRateLimitHandler,
  }),
);
app.use('/api/v1/auth', authRouter);
app.use(
  ['/api/v1/organizer/event-images', '/api/v1/organizer/candidate-images'],
  apiRateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    handler: authRateLimitHandler,
  }),
);
app.use('/api/v1/organizer', organizerRouter);
app.use(
  '/api/v1/superadmin/financial',
  apiRateLimit({ windowMs: 60_000, limit: 30 }),
  financialRouter,
);
app.use(['/api/v1/public/candidate-images', '/api/v1/public/event-images'], (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.get('/api/v1/public/candidate-images/:filename', serveStoredImage('candidates'));
app.get('/api/v1/public/event-images/:filename', serveStoredImage('events'));
app.use(
  '/api/v1/public/candidate-images',
  express.static(
    path.resolve(process.cwd(), 'backend', 'uploads', 'candidates'),
    {
      fallthrough: false,
      maxAge: '1d',
      immutable: false,
    },
  ),
);
app.use(
  '/api/v1/public/event-images',
  express.static(path.resolve(process.cwd(), 'backend', 'uploads', 'events'), {
    fallthrough: false,
    maxAge: '1d',
    immutable: false,
  }),
);
app.use(
  '/api/v1/payments',
  apiRateLimit({ windowMs: 60_000, limit: 30 }),
  paymentsRouter,
);
app.use('/api/v1/public', publicRouter);
app.use(
  '/api/v1/vote-orders',
  apiRateLimit({
    windowMs: 60_000,
    limit: 12,
    keyGenerator: rateLimitPhoneKeyFromBody('phone'),
    handler: authRateLimitHandler,
  }),
  voteOrdersRouter,
);

// Railway can serve the app and API on one origin. Marketing has its own build.
if (env.NODE_ENV === 'production') {
  const appDirectory = path.resolve(process.cwd(), 'dist');
  app.use(express.static(appDirectory, { index: false }));
  app.get('/{*path}', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(appDirectory, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
