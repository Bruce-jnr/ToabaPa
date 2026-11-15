import express, { Router } from 'express';
import { AppError } from '../errors/app-error.js';
import { env } from '../config/env.js';
import { matchesSharedSecret } from '../security/shared-secret.js';
import { naloRequestSchema, naloResponse } from '../ussd/nalo.js';
import { handleUssd } from '../ussd/ussd.service.js';

export const ussdRouter = Router();
// NALO's published callback contract does not specify a signature.
ussdRouter.use((req, res, next) => {
  if (!env.NALO_USSD_SECRET) {
    if (env.NODE_ENV === 'production') {
      res.status(503).json({ success: false, error: { code: 'USSD_AUTH_NOT_CONFIGURED', message: 'USSD callback authentication is unavailable.' } });
      return;
    }
    next();
    return;
  }
  const bearer = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  const supplied = req.header('x-nalo-secret') || bearer || (typeof req.query.token === 'string' ? req.query.token : '');
  if (!matchesSharedSecret(supplied, env.NALO_USSD_SECRET)) {
    res.status(401).json({ success: false, error: { code: 'INVALID_USSD_SIGNATURE', message: 'USSD callback authentication failed.' } });
    return;
  }
  next();
});
ussdRouter.use(express.json({ limit: '10kb' }));
ussdRouter.post('/nalo', async (req, res, next) => {
  let request;
  try {
    request = naloRequestSchema.parse(req.body);
    const result = await handleUssd(request);
    res.json(naloResponse(request, result.message, result.continueSession));
  } catch (error) {
    if (request && error instanceof AppError) {
      res.json(naloResponse(request, error.message, false));
      return;
    }
    next(error);
  }
});
