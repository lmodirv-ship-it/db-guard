/**
 * Primary site owner — protected from deletion or role change.
 * This account is the root administrator of the platform.
 */
export const PROTECTED_OWNER_EMAIL = "lmodirv@gmail.com";

export function isProtectedOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PROTECTED_OWNER_EMAIL;
}
