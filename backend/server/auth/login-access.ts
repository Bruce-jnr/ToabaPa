import { MembershipStatus, OrganizationRole, type GlobalRole } from '@prisma/client';

export function canAccessDashboard(globalRole: GlobalRole, membership: { role: OrganizationRole; status: MembershipStatus } | undefined): boolean {
  return membership?.status === MembershipStatus.ACTIVE &&
    (globalRole === 'SUPER_ADMIN' || membership.role === OrganizationRole.EVENT_ADMIN);
}
