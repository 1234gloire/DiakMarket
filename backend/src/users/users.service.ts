import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

export interface SupabaseIdentity {
  id: string;
  email?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

/** Supabase's JWT carries unset email/phone as `""`, not null — and both columns are @unique,
 * so writing "" verbatim lets exactly one phoneless (or emailless) user JIT-provision before
 * every subsequent one collides on the unique constraint. Always normalize blank to null. */
function blankToNull(value: string | null | undefined): string | null | undefined {
  return value === '' ? null : value;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * JIT-provisions the local `users` row the first time a Supabase-authenticated request
   * reaches the API. Supabase Auth remains the identity source of truth; this table only
   * carries the marketplace-specific state (roles, status) NestJS is responsible for.
   */
  async syncFromSupabase(identity: SupabaseIdentity): Promise<AuthenticatedUser> {
    const email = blankToNull(identity.email);
    const phone = blankToNull(identity.phone);

    const user = await this.prisma.user.upsert({
      where: { id: identity.id },
      update: {
        email: email ?? undefined,
        phone: phone ?? undefined,
        emailVerified: identity.emailVerified ?? undefined,
        phoneVerified: identity.phoneVerified ?? undefined,
      },
      create: {
        id: identity.id,
        email: email ?? null,
        phone: phone ?? null,
        emailVerified: identity.emailVerified ?? false,
        phoneVerified: identity.phoneVerified ?? false,
        status: 'ACTIVE',
        profile: {
          create: {
            displayName: email?.split('@')[0] ?? phone ?? 'Utilisateur',
          },
        },
      },
      select: { id: true, email: true, phone: true, roles: true, status: true },
    });

    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string; avatarPublicId?: string }) {
    return this.prisma.profile.update({
      where: { userId },
      data,
    });
  }

  async setCountry(userId: string, countryId: string) {
    const country = await this.prisma.country.findFirst({ where: { id: countryId, isActive: true } });
    if (!country) throw new NotFoundException('Country not found or inactive');
    return this.prisma.user.update({ where: { id: userId }, data: { countryId }, include: { profile: true } });
  }

  async setRoles(userId: string, roles: AuthenticatedUser['roles']) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { roles },
      select: { id: true, roles: true },
    });
  }
}
