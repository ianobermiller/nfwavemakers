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

export async function requestPasswordReset(email: string): Promise<void> {
  await pb.collection(collections.authUsers).requestPasswordReset(email);
}

export function signOut(): void {
  pb.authStore.clear();
}
