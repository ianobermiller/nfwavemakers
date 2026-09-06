import { z } from 'zod';
import { pb } from './pocketbase.ts';

type Base64URL = string;

const transportSchema = z.enum(['ble', 'hybrid', 'internal', 'nfc', 'usb']);
const credentialDescriptorSchema = z.object({
  id: z.string(),
  transports: z.array(transportSchema).optional(),
  type: z.literal('public-key'),
});
const userVerificationSchema = z.enum(['discouraged', 'preferred', 'required']);
const creationOptionsSchema = z.object({
  publicKey: z.object({
    attestation: z.enum(['direct', 'enterprise', 'indirect', 'none']).optional(),
    authenticatorSelection: z
      .object({
        authenticatorAttachment: z.enum(['cross-platform', 'platform']).optional(),
        requireResidentKey: z.boolean().optional(),
        residentKey: z.enum(['discouraged', 'preferred', 'required']).optional(),
        userVerification: userVerificationSchema.optional(),
      })
      .optional(),
    challenge: z.string(),
    excludeCredentials: z.array(credentialDescriptorSchema).optional(),
    pubKeyCredParams: z.array(
      z.object({
        alg: z.number(),
        type: z.literal('public-key'),
      }),
    ),
    rp: z.object({
      id: z.string().optional(),
      name: z.string(),
    }),
    timeout: z.number().optional(),
    user: z.object({
      displayName: z.string(),
      id: z.string(),
      name: z.string(),
    }),
  }),
});
const requestOptionsSchema = z.object({
  publicKey: z.object({
    allowCredentials: z.array(credentialDescriptorSchema).optional(),
    challenge: z.string(),
    rpId: z.string().optional(),
    timeout: z.number().optional(),
    userVerification: userVerificationSchema.optional(),
  }),
});
const loginResultSchema = z.object({
  record: z.looseObject({
    collectionId: z.string(),
    collectionName: z.string(),
    id: z.string(),
  }),
  token: z.string(),
});

function decodeBase64URL(value: Base64URL): ArrayBuffer {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return bytes.buffer;
}

function encodeBase64URL(value: ArrayBuffer): Base64URL {
  const bytes = new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeDescriptors(
  descriptors: z.infer<typeof credentialDescriptorSchema>[] | undefined,
): PublicKeyCredentialDescriptor[] | undefined {
  return descriptors?.map((descriptor) => {
    const decoded: PublicKeyCredentialDescriptor = {
      id: decodeBase64URL(descriptor.id),
      type: descriptor.type,
    };
    if (descriptor.transports) decoded.transports = descriptor.transports;
    return decoded;
  });
}

function decodeCreationOptions(
  options: z.infer<typeof creationOptionsSchema>['publicKey'],
): PublicKeyCredentialCreationOptions {
  const rp: PublicKeyCredentialRpEntity = { name: options.rp.name };
  if (options.rp.id) rp.id = options.rp.id;
  const decoded: PublicKeyCredentialCreationOptions = {
    challenge: decodeBase64URL(options.challenge),
    pubKeyCredParams: options.pubKeyCredParams,
    rp,
    user: {
      ...options.user,
      id: decodeBase64URL(options.user.id),
    },
  };
  if (options.attestation) decoded.attestation = options.attestation;
  if (options.authenticatorSelection) {
    const selection: AuthenticatorSelectionCriteria = {};
    if (options.authenticatorSelection.authenticatorAttachment) {
      selection.authenticatorAttachment = options.authenticatorSelection.authenticatorAttachment;
    }
    if (options.authenticatorSelection.requireResidentKey !== undefined) {
      selection.requireResidentKey = options.authenticatorSelection.requireResidentKey;
    }
    if (options.authenticatorSelection.residentKey) {
      selection.residentKey = options.authenticatorSelection.residentKey;
    }
    if (options.authenticatorSelection.userVerification) {
      selection.userVerification = options.authenticatorSelection.userVerification;
    }
    decoded.authenticatorSelection = selection;
  }
  const excludeCredentials = decodeDescriptors(options.excludeCredentials);
  if (excludeCredentials) decoded.excludeCredentials = excludeCredentials;
  if (options.timeout !== undefined) decoded.timeout = options.timeout;
  return decoded;
}

function decodeRequestOptions(
  options: z.infer<typeof requestOptionsSchema>['publicKey'],
): PublicKeyCredentialRequestOptions {
  const decoded: PublicKeyCredentialRequestOptions = {
    challenge: decodeBase64URL(options.challenge),
  };
  const allowCredentials = decodeDescriptors(options.allowCredentials);
  if (allowCredentials) decoded.allowCredentials = allowCredentials;
  if (options.rpId) decoded.rpId = options.rpId;
  if (options.timeout !== undefined) decoded.timeout = options.timeout;
  if (options.userVerification) decoded.userVerification = options.userVerification;
  return decoded;
}

async function postJSON(path: string, body: object, authorization?: string): Promise<unknown> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (authorization) headers.set('Authorization', authorization);

  const response = await fetch(`${pb.baseURL}${path}`, {
    body: JSON.stringify(body),
    credentials: 'omit',
    headers,
    method: 'POST',
  });

  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = z
      .object({ error: z.string().optional(), message: z.string().optional() })
      .safeParse(result);
    const message = parsed.success ? parsed.data.error || parsed.data.message : undefined;
    throw new Error(message || `Passkey request failed (${response.status})`);
  }
  return result;
}

function requirePublicKeyCredential(credential: Credential | null): PublicKeyCredential {
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('The browser did not return a passkey credential');
  }
  return credential;
}

function registrationPayload(credential: PublicKeyCredential): object {
  const response = credential.response;
  if (!(response instanceof AuthenticatorAttestationResponse)) {
    throw new Error('The browser returned an invalid passkey registration response');
  }
  return {
    id: credential.id,
    rawId: encodeBase64URL(credential.rawId),
    response: {
      attestationObject: encodeBase64URL(response.attestationObject),
      clientDataJSON: encodeBase64URL(response.clientDataJSON),
      transports: response.getTransports(),
    },
    type: credential.type,
  };
}

function assertionPayload(credential: PublicKeyCredential): object {
  const response = credential.response;
  if (!(response instanceof AuthenticatorAssertionResponse)) {
    throw new Error('The browser returned an invalid passkey sign-in response');
  }
  return {
    id: credential.id,
    rawId: encodeBase64URL(credential.rawId),
    response: {
      authenticatorData: encodeBase64URL(response.authenticatorData),
      clientDataJSON: encodeBase64URL(response.clientDataJSON),
      signature: encodeBase64URL(response.signature),
      userHandle: response.userHandle ? encodeBase64URL(response.userHandle) : null,
    },
    type: credential.type,
  };
}

export function passkeysSupported(): boolean {
  return (
    window.isSecureContext &&
    typeof PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  );
}

export function isPasskeyCanceled(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'NotAllowedError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'NotAllowedError')
  );
}

export async function registerPasskey(): Promise<void> {
  if (!pb.authStore.isValid || !pb.authStore.token) {
    throw new Error('Sign in before adding a passkey');
  }
  if (!passkeysSupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }

  const token = pb.authStore.token;
  const options = creationOptionsSchema.parse(
    await postJSON('/api/passkey/register/begin', {}, token),
  );
  const credential = requirePublicKeyCredential(
    await navigator.credentials.create({
      publicKey: decodeCreationOptions(options.publicKey),
    }),
  );
  await postJSON('/api/passkey/register/finish', registrationPayload(credential), token);
}

interface PasskeyIdentifier {
  email?: string;
}

function identifierFor(email?: string): PasskeyIdentifier {
  const normalized = email?.trim().toLowerCase();
  return normalized ? { email: normalized } : {};
}

async function beginSignIn(
  identifier: PasskeyIdentifier,
): Promise<PublicKeyCredentialRequestOptions> {
  const options = requestOptionsSchema.parse(
    await postJSON('/api/passkey/login/begin', identifier),
  );
  return decodeRequestOptions(options.publicKey);
}

async function finishSignIn(
  identifier: PasskeyIdentifier,
  credential: PublicKeyCredential,
): Promise<void> {
  const result = loginResultSchema.parse(
    await postJSON('/api/passkey/login/finish', {
      ...identifier,
      ...assertionPayload(credential),
    }),
  );
  pb.authStore.save(result.token, result.record);
}

// Without an email the server starts a discoverable login and the authenticator
// picks which passkey to use.
export async function signInWithPasskey(email?: string): Promise<void> {
  if (!passkeysSupported()) {
    throw new Error('Passkeys are not supported in this browser');
  }

  const identifier = identifierFor(email);
  const credential = requirePublicKeyCredential(
    await navigator.credentials.get({ publicKey: await beginSignIn(identifier) }),
  );
  await finishSignIn(identifier, credential);
}

export async function passkeyAutofillAvailable(): Promise<boolean> {
  return (
    passkeysSupported() &&
    typeof PublicKeyCredential.isConditionalMediationAvailable === 'function' &&
    (await PublicKeyCredential.isConditionalMediationAvailable())
  );
}

// Offers passkeys in the browser's autofill dropdown instead of a modal. Stays
// pending until the person picks one or the caller aborts.
export async function signInWithPasskeyAutofill(signal: AbortSignal): Promise<void> {
  const publicKey = await beginSignIn({});
  if (signal.aborted) return;

  const credential = requirePublicKeyCredential(
    await navigator.credentials.get({ mediation: 'conditional', publicKey, signal }),
  );
  await finishSignIn({}, credential);
}
