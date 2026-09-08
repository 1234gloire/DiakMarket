import { SetMetadata } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

/** Grants access when the current user has at least one of the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
