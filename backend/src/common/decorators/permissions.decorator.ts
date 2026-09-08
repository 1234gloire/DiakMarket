import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Grants access when the current user's roles resolve (via RolePermission) to ALL of the
 * given permission codes. Use for fine-grained checks that must stay configurable without a
 * redeploy (e.g. "payouts.approve") — coarse checks should prefer @Roles().
 */
export const RequirePermissions = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);
