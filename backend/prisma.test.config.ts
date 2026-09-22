import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({ path: '.env.test' });

// Mirrors prisma.config.ts but loads .env.test instead of .env — used by the e2e test global
// setup to migrate/seed the dedicated test database without touching dev or Supabase.
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
