import { EventStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { restoredEventStatus } from './event-restoration.js';

const start = new Date('2027-01-01T00:00:00Z');
const end = new Date('2027-02-01T00:00:00Z');

describe('restoredEventStatus', () => {
  it('keeps an upcoming event scheduled', () => {
    expect(restoredEventStatus(start, end, new Date('2026-12-31T23:59:59Z'))).toBe(EventStatus.SCHEDULED);
  });

  it('restores an event in its voting window paused', () => {
    expect(restoredEventStatus(start, end, start)).toBe(EventStatus.PAUSED);
  });

  it('keeps a completed event ended', () => {
    expect(restoredEventStatus(start, end, end)).toBe(EventStatus.ENDED);
  });
});
