/** Returns true if the role has any admin privilege */
export function isAdmin(role: string): boolean {
  return role === "admin" || role === "superadmin";
}

/** Returns true only for the global superadmin */
export function isSuperAdmin(role: string): boolean {
  return role === "superadmin";
}

/**
 * Returns true if an admin with the given role and tenantId
 * is allowed to act on a resource belonging to targetTenantId.
 */
export function canManageUser(
  role: string,
  actorTenantId: string,
  targetTenantId: string
): boolean {
  if (role === "superadmin") return true;
  return role === "admin" && actorTenantId === targetTenantId;
}
