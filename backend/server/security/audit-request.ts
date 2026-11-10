import type { Request } from 'express';
import { isIP } from 'node:net';

function normalizedIp(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  const mappedIpv4 = candidate.startsWith('::ffff:')
    ? candidate.slice('::ffff:'.length)
    : '';
  if (mappedIpv4 && isIP(mappedIpv4) === 4) return mappedIpv4;
  return isIP(candidate) ? candidate : null;
}

export function auditRequestContext(req: Request) {
  const userAgent = req.get('user-agent')?.trim().slice(0, 512) || null;
  return {
    ipAddress: normalizedIp(req.ip),
    userAgent,
  };
}
