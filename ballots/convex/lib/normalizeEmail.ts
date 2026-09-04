export function normalizeEmail(email: null | string | undefined): string | undefined {
    const normalized = email?.trim().toLowerCase();
    return normalized || undefined;
}
