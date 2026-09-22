import { execSync } from 'node:child_process';
import pg from 'pg';

/**
 * Runs once before the e2e suite: makes sure `diakmarket_test` exists on the local Docker
 * Postgres (see ../../docker-compose.yml), then applies migrations and seeds reference data
 * against it via prisma.test.config.ts. Never touches dev data or the real Supabase project.
 */
export default async function globalSetup() {
  const admin = new pg.Client({
    connectionString: 'postgresql://diakmarket:diakmarket@localhost:5433/diakmarket',
  });
  await admin.connect();
  const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'diakmarket_test'");
  if (rows.length === 0) {
    await admin.query('CREATE DATABASE diakmarket_test');
  }
  await admin.end();

  execSync('npx prisma migrate deploy --config prisma.test.config.ts', { stdio: 'inherit' });
  execSync('npx prisma db seed --config prisma.test.config.ts', { stdio: 'inherit' });
}
