import { createHmac, randomUUID } from 'node:crypto';

/**
 * Mints a Supabase-shaped HS256 JWT signed with SUPABASE_JWT_SECRET (see .env.test), so e2e
 * tests can exercise the real SupabaseJwtStrategy without a network call to a real Supabase
 * project. Mirrors exactly what production verifies: header/payload/signature over HS256.
 */
export function mintTestJwt(options: { sub?: string; email?: string; phone?: string | null } = {}) {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET must be set (see .env.test) to mint test JWTs');

  const sub = options.sub ?? randomUUID();
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub,
    aud: 'authenticated',
    role: 'authenticated',
    iat: now,
    exp: now + 3600,
    // Supabase always includes these keys, using "" (not omitting/null) when unset — tests
    // deliberately default to that shape so the blankToNull regression stays covered.
    email: options.email ?? '',
    phone: options.phone === undefined ? '' : (options.phone ?? ''),
  };
  if (options.email) payload.email_confirmed_at = new Date().toISOString();

  const base64url = (input: string | Buffer) =>
    Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest());

  return { token: `${encodedHeader}.${encodedPayload}.${signature}`, sub };
}
