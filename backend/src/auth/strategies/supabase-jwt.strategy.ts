import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type SecretOrKeyProvider } from 'passport-jwt';
import jwksRsa from 'jwks-rsa';
import { UsersService } from '../../users/users.service.js';
import type { AuthenticatedUser } from '../types/authenticated-user.type.js';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
}

/**
 * Verifies Supabase-issued access tokens.
 *
 * Supabase projects sign JWTs either with a shared HS256 secret (legacy, "JWT Secret" in
 * Project Settings > API) or with an asymmetric key pair exposed via a JWKS endpoint
 * (current default for new projects). We support both: set SUPABASE_JWT_SECRET for the
 * legacy path, or leave it empty to verify against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = config.get<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');

    const secretOrKeyProvider: SecretOrKeyProvider = jwtSecret
      ? (_request, _rawJwtToken, done) => done(null, jwtSecret)
      : jwksRsa.passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
        });

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider,
      algorithms: jwtSecret ? ['HS256'] : ['ES256', 'RS256'],
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<AuthenticatedUser> {
    return this.usersService.syncFromSupabase({
      id: payload.sub,
      email: payload.email,
      phone: payload.phone,
      emailVerified: Boolean(payload.email_confirmed_at),
      phoneVerified: Boolean(payload.phone_confirmed_at),
    });
  }
}
