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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * JIT-provisions the local `users` row the first time a Supabase-authenticated request
   * reaches the API. Supabase Auth remains the identity source of truth; this table only
   * carries the marketplace-specific state (roles, status) NestJS is responsible for.
   */
  async syncFromSupabase(identity: SupabaseIdentity): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.upsert({
      where: { id: identity.id },
      update: {
        email: identity.email ?? undefined,
        phone: identity.phone ?? undefined,
        emailVerified: identity.emailVerified ?? undefined,
        phoneVerified: identity.phoneVerified ?? undefined,
      },
      create: {
        id: identity.id,
        email: identity.email ?? null,
        phone: identity.phone ?? null,
        emailVerified: identity.emailVerified ?? false,
        phoneVerified: identity.phoneVerified ?? false,
        status: 'ACTIVE',
        profile: {
          create: {
            displayName: identity.email?.split('@')[0] ?? identity.phone ?? 'Utilisateur',
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
