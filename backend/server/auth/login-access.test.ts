import { GlobalRole, MembershipStatus, OrganizationRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { canAccessDashboard } from './login-access.js';

describe('dashboard login access', () => {
  it('allows an active superadmin or event administrator', () => {
    expect(canAccessDashboard(GlobalRole.SUPER_ADMIN, { role: OrganizationRole.ORGANIZATION_OWNER, status: MembershipStatus.ACTIVE })).toBe(true);
    expect(canAccessDashboard(GlobalRole.USER, { role: OrganizationRole.EVENT_ADMIN, status: MembershipStatus.ACTIVE })).toBe(true);
  });

  it('rejects inactive and unrelated memberships', () => {
    expect(canAccessDashboard(GlobalRole.USER, { role: OrganizationRole.FINANCE_ADMIN, status: MembershipStatus.ACTIVE })).toBe(false);
    expect(canAccessDashboard(GlobalRole.USER, { role: OrganizationRole.EVENT_ADMIN, status: MembershipStatus.SUSPENDED })).toBe(false);
    expect(canAccessDashboard(GlobalRole.SUPER_ADMIN, undefined)).toBe(false);
  });
});
