import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { runableManagedAuth } from '@runablehq/managed-auth/server';
import { db } from './database';

export const OWNER_EMAIL = 'brandonazevedo87@gmail.com';
export const auth = betterAuth({
  basePath: '/api/auth', baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: request => request?.headers.get('origin') ? [request.headers.get('origin')!] : [],
  hooks: { before: createAuthMiddleware(async ctx => {
    if (ctx.path === '/sign-up/email' && ctx.body?.email?.toLowerCase() === OWNER_EMAIL)
      throw new APIError('FORBIDDEN', { message: 'O administrador deve entrar com sua conta Google.' });
  }) },
  plugins: [...runableManagedAuth({ applicationId: process.env.APPLICATION_ID!, issuer: process.env.VITE_RUNABLE_AUTH_ISSUER! })],
});