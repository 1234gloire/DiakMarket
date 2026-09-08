import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCodes = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredCodes || requiredCodes.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user || user.roles.length === 0) return false;

    // SUPER_ADMIN bypasses fine-grained permission checks by design.
    if (user.roles.includes('SUPER_ADMIN')) return true;

    const grants = await this.prisma.rolePermission.findMany({
      where: { role: { in: user.roles }, permission: { code: { in: requiredCodes } } },
      select: { permission: { select: { code: true } } },
    });
    const grantedCodes = new Set(grants.map((g) => g.permission.code));

    return requiredCodes.every((code) => grantedCodes.has(code));
  }
}
