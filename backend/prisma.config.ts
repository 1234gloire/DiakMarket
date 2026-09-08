import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Supabase gives two connection strings: DATABASE_URL (pooled, pgbouncer, port 6543) and
// DIRECT_URL (direct, port 5432). The CLI (migrate/introspect) needs the direct connection —
// pgbouncer doesn't support the session features migrations rely on — so `datasource.url`
// here is DIRECT_URL. The running app never reads this file: PrismaService builds its own
// @prisma/adapter-pg connection from DATABASE_URL (the pooled string) at runtime instead.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
});
