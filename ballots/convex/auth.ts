import { passkey } from '@better-auth/passkey';
import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';
import { emailOTP } from 'better-auth/plugins';

import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import authConfig from './auth.config';
import authSchema from './betterAuth/schema';

const siteUrl = process.env['SITE_URL'] ?? 'http://localhost:5173';
const siteHost = new URL(siteUrl).hostname;
// Parent domain so passkeys registered on nfwavemakers.com still work on the subdomain.
const relyingPartyId =
  siteHost === 'localhost' || siteHost === '127.0.0.1' ? siteHost : 'nfwavemakers.com';

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: {
    schema: authSchema,
  },
});

function isLocalSite(): boolean {
  return siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');
}

// Better Auth runs sendVerificationOTP as a background task and swallows anything it
// throws, so a hosted deployment missing these silently drops every sign-in code while
// still reporting success. Throwing here fails `convex deploy` instead.
const requiredHostedEnv = ['AUTH_RESEND_KEY', 'BETTER_AUTH_SECRET'];
if (!isLocalSite()) {
  const missing = requiredHostedEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `SITE_URL is ${siteUrl}, but this deployment is missing ${missing.join(', ')}. ` +
        `Set each with \`npx convex env set <NAME> <value> --prod\`.`,
    );
  }
}

/** RFC 2606 / 6761 reserved names — Resend rejects these as `to` addresses. */
function isReservedTestEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return (
    domain === 'example.com' ||
    domain.endsWith('.example.com') ||
    domain === 'example.net' ||
    domain === 'example.org' ||
    domain === 'localhost' ||
    domain.endsWith('.test')
  );
}

function localTrustedOrigins(): string[] {
  if (!isLocalSite()) {
    return [];
  }
  return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
}

async function persistLocalOtp(ctx: GenericCtx<DataModel>, email: string, otp: string): Promise<void> {
  if (!isLocalSite() || !('runMutation' in ctx)) {
    return;
  }
  await ctx.runMutation(internal.devAuth.storeOtp, { email, otp });
}

async function sendVerificationCode(email: string, otp: string, type: string): Promise<void> {
  if (isLocalSite() && isReservedTestEmail(email)) {
    console.log(`[auth] OTP for ${email}: ${otp}`);
    return;
  }

  const apiKey = process.env['AUTH_RESEND_KEY'];
  if (!apiKey) {
    if (isLocalSite()) {
      console.log(`[auth] OTP for ${email}: ${otp}`);
      return;
    }
    throw new Error('Missing AUTH_RESEND_KEY');
  }

  const purpose =
    type === 'forget-password'
      ? 'password reset'
      : type === 'email-verification'
        ? 'email verification'
        : 'sign-in';
  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: process.env['AUTH_EMAIL'] ?? 'NF Wavemakers <notifications@updates.obermillers.com>',
      html: `<p>Your NF Wavemakers Ballots ${purpose} code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:0.2em">${otp}</p><p>This code expires in 15 minutes.</p>`,
      subject: `Your NF Wavemakers Ballots ${purpose} code`,
      text: `Your NF Wavemakers Ballots ${purpose} code is ${otp}. It expires in 15 minutes.`,
      to: [email],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${await response.text()}`);
  }
}

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['apple'],
      },
    },
    baseURL: process.env['CONVEX_SITE_URL'] ?? siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    plugins: [
      passkey({
        origin: siteUrl,
        rpID: relyingPartyId,
        rpName: 'NF Wavemakers Ballots',
      }),
      emailOTP({
        expiresIn: 60 * 15,
        otpLength: 6,
        overrideDefaultEmailVerification: true,
        async sendVerificationOTP({ email, otp, type }) {
          await persistLocalOtp(ctx, email, otp);
          await sendVerificationCode(email, otp, type);
        },
      }),
      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
    trustedOrigins: [
      siteUrl,
      'https://ballots.nfwavemakers.com',
      'https://nfwm-ballots.pages.dev',
      ...localTrustedOrigins(),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
