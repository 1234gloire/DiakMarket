import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as not requiring authentication. Everything else requires a valid Supabase JWT. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
