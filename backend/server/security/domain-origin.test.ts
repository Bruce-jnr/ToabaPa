import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { env } from '../config/env.js';

describe('two-domain origin policy', () => {
  it('allows marketing-origin reads of public event data without credentialed CORS', async () => {
    const response = await request(app).options('/api/v1/public/events').set('Origin', env.MARKETING_URL);
    expect(response.headers['access-control-allow-origin']).toBe(env.MARKETING_URL);
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('does not authorize marketing-origin authentication requests', async () => {
    const response = await request(app).post('/api/v1/auth/login').set('Origin', env.MARKETING_URL).send({ identifier: 'user', password: 'password' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('INVALID_REQUEST_ORIGIN');
  });

});
