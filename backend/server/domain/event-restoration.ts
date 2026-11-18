import { EventStatus } from '@prisma/client';

export function restoredEventStatus(startAt: Date, endAt: Date, now: Date): EventStatus {
  if (endAt <= now) return EventStatus.ENDED;
  if (startAt > now) return EventStatus.SCHEDULED;
  return EventStatus.PAUSED;
}
