import { Role, User } from "@/types";
import { useAuth } from "@/context/AuthContext";

/**
 * Staff = reads everywhere, create/update clients and reservations (incl. status),
 * NO deletes, NO writes on services/therapists/staff.
 * Admin = everything except creating/modifying owner/admin accounts.
 * Owner = everything.
 */

export function canManageServices(role?: Role | null): boolean {
  return role === "owner" || role === "admin";
}

export function canManageTherapists(role?: Role | null): boolean {
  return role === "owner" || role === "admin";
}

export function canManageStaff(role?: Role | null): boolean {
  return role === "owner" || role === "admin";
}

export function canDelete(role?: Role | null): boolean {
  return role === "owner" || role === "admin";
}

export function canSeeRevenue(role?: Role | null): boolean {
  return role === "owner" || role === "admin";
}

export interface AccountEditPermission {
  canEdit: boolean;
  canDeactivate: boolean;
  canChangeRole: boolean;
  reason?: string;
}

/**
 * Evaluates permissions to edit a staff/user account.
 * - staff cannot edit any accounts.
 * - admin can only create/edit staff accounts (cannot modify owner or other admin accounts).
 * - admin/owner cannot deactivate or change role of their own account (self-deactivate/demote).
 * - owner can edit all accounts (except self-demote/self-deactivate).
 */
export function canEditAccount(
  currentUser: { role: Role; id?: number } | null | undefined,
  targetUser: { role: Role; id: number }
): AccountEditPermission {
  if (!currentUser) {
    return { canEdit: false, canDeactivate: false, canChangeRole: false, reason: "Not logged in." };
  }

  if (currentUser.role === "staff") {
    return { canEdit: false, canDeactivate: false, canChangeRole: false, reason: "Staff members cannot manage user accounts." };
  }

  const isSelf = currentUser.id === targetUser.id;

  if (currentUser.role === "admin") {
    if (targetUser.role === "owner") {
      return { canEdit: false, canDeactivate: false, canChangeRole: false, reason: "Admins cannot modify owner accounts." };
    }
    if (targetUser.role === "admin" && !isSelf) {
      return { canEdit: false, canDeactivate: false, canChangeRole: false, reason: "Admins cannot modify other admin accounts." };
    }
    if (isSelf) {
      return {
        canEdit: true,
        canDeactivate: false,
        canChangeRole: false,
        reason: "You cannot deactivate or change the role of your own account.",
      };
    }
    return { canEdit: true, canDeactivate: true, canChangeRole: true };
  }

  if (currentUser.role === "owner") {
    if (isSelf) {
      return {
        canEdit: true,
        canDeactivate: false,
        canChangeRole: false,
        reason: "The owner account cannot be deactivated or demoted.",
      };
    }
    return { canEdit: true, canDeactivate: true, canChangeRole: true };
  }

  return { canEdit: false, canDeactivate: false, canChangeRole: false };
}

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;

  return {
    role,
    isOwner: role === "owner",
    isAdmin: role === "admin",
    isStaff: role === "staff",
    canManageServices: canManageServices(role),
    canManageTherapists: canManageTherapists(role),
    canManageStaff: canManageStaff(role),
    canDelete: canDelete(role),
    canSeeRevenue: canSeeRevenue(role),
    canEditAccount: (targetUser: { role: Role; id: number }) => canEditAccount(user, targetUser),
  };
}
