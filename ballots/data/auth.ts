import { ClientResponseError } from 'pocketbase';
import { collections, pb } from './pocketbase.ts';

export async function requestSignInCode(email: string): Promise<string> {
  const result = await pb.collection(collections.authUsers).requestOTP(email);
  return result.otpId;
}

export async function signInWithCode(otpId: string, code: string): Promise<void> {
  await pb.collection(collections.authUsers).authWithOTP(otpId, code);
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  await pb.collection(collections.authUsers).authWithPassword(email, password);
}

export async function createAccount(email: string, password: string): Promise<void> {
  await pb.collection(collections.authUsers).create({
    email,
    password,
    passwordConfirm: password,
  });
  await pb.collection(collections.authUsers).requestVerification(email);
  await signInWithPassword(email, password);
}

/**
 * Create an account that can receive a sign-up code. Returns the generated
 * password when the account is new, or undefined when the email is already
 * registered so the caller can send a code to the existing account.
 */
export async function createPasswordlessAccount(email: string): Promise<string | undefined> {
  const password = randomPassword();
  try {
    await pb.collection(collections.authUsers).create({
      email,
      password,
      passwordConfirm: password,
    });
    return password;
  } catch (error: unknown) {
    if (isEmailTaken(error)) return undefined;
    throw error;
  }
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isEmailTaken(error: unknown): boolean {
  if (!(error instanceof ClientResponseError)) return false;
  const data = error.response['data'];
  if (!data || typeof data !== 'object' || !('email' in data)) return false;
  const email = Reflect.get(data, 'email');
  if (!email || typeof email !== 'object' || !('code' in email)) return false;
  const code = Reflect.get(email, 'code');
  return code === 'validation_invalid_email' || code === 'validation_not_unique';
}

export async function requestPasswordReset(email: string): Promise<void> {
  await pb.collection(collections.authUsers).requestPasswordReset(email);
}

/** Change the signed-in user's password. Re-authenticates so the session stays valid. */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const record = pb.authStore.record;
  const email = typeof record?.['email'] === 'string' ? record['email'] : '';
  if (!record?.id || !email) throw new Error('Not authenticated');

  await pb.collection(collections.authUsers).update(record.id, {
    oldPassword,
    password: newPassword,
    passwordConfirm: newPassword,
  });
  await signInWithPassword(email, newPassword);
}

export function signOut(): void {
  pb.authStore.clear();
}
