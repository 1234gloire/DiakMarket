import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';

/** Direct DB access for test setup that has no API surface (e.g. granting a role to bootstrap
 * an admin test user — mirrors how a real first admin must be promoted out-of-band too). */
export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function promoteToAdmin(userId: string) {
  await testPrisma.user.update({ where: { id: userId }, data: { roles: ['ADMIN', 'SUPER_ADMIN'] } });
}
