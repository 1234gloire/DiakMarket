import { config } from 'dotenv';

// Loaded before every e2e test file: points the app under test (via @nestjs/config reading
// process.env) at the dedicated test database instead of dev/.env.
config({ path: '.env.test', override: true });
