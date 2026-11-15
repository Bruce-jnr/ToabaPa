import { describe, expect, it } from 'vitest';
import { naloRequestSchema, naloResponse } from './nalo.js';

describe('NALO USSD callback contract', () => {
  it('accepts the documented callback and echoes the required response fields', () => {
    const request = naloRequestSchema.parse({
      SESSIONID: 'session-1', USERID: 'NALOTest', MSISDN: '233551234987',
      USERDATA: '', MSGTYPE: true, NETWORK: 'MTN',
    });
    expect(naloResponse(request, '1. Vote', true)).toEqual({
      SESSIONID: 'session-1', USERID: 'NALOTest', MSISDN: '233551234987',
      USERDATA: '', MSG: '1. Vote', MSGTYPE: true,
    });
    expect(naloResponse(request, 'Goodbye', false).MSGTYPE).toBe(false);
  });
});
