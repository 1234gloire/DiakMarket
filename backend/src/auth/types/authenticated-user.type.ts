import type { Role, UserStatus } from '../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string | null;
  roles: Role[];
  status: UserStatus;
}
