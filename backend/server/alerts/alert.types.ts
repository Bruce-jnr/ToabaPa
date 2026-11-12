export type AlertSeverity = "P1" | "P2";
export type SafeAlertValue = string | number | boolean | null;

export type SecurityAlert = {
  code: string;
  severity: AlertSeverity;
  title: string;
  operatorAction: string;
  details?: Record<string, SafeAlertValue>;
  organizationId?: string;
  eventId?: string;
  resourceType?: string;
  resourceId?: string;
  correlationId?: string;
  threshold?: number;
  dedupeParts?: Array<string | number | null | undefined>;
};

export type StoredAlertPayload = Omit<
  SecurityAlert,
  "threshold" | "dedupeParts"
> & {
  occurredAt: string;
  environment: string;
};
