import { Role } from "@/types";
import { useAuth } from "@/context/AuthContext";

/**
 * Staff = reads everywhere, create/update clients and reservations (incl. status),
 * NO deletes, NO writes on services/therapists/staff.
 * Admin = everything except creating/modifying owner/admin accounts.
 * Owner = everything.
 * Superuser = platform management only; forbidden from tenant actions.
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

export function canManagePlatform(role?: Role | null): boolean {
  return role === "superuser";
}

export interface AccountEditPermission {
  canEdit: boolean;
  canDeactivate: boolean;
  canChangeRole: boolean;
  canResetPassword: boolean;
  reason?: string;
}

/**
 * Returns allowed roles that can be assigned by the caller.
 * - Owner caller: only "admin" and "staff".
 * - Admin caller: only "staff".
 * - "owner" and "superuser" never appear for tenant users.
 */
export function getAllowedRolesForCaller(callerRole?: Role | null): Role[] {
  if (callerRole === "owner") {
    return ["admin", "staff"];
  }
  if (callerRole === "admin") {
    return ["staff"];
  }
  return [];
}

/**
 * Evaluates permissions to edit a staff/user account.
 * - staff cannot edit any accounts.
 * - owner accounts are managed solely by platform administrator (cannot be modified by owners or admins).
 * - admin can only create/edit staff accounts (cannot modify owner or other admin accounts).
 * - admin/owner cannot deactivate or change role of their own account (self-deactivate/demote).
 * - signed-in user's own row allows editing name and email.
 */
export function canEditAccount(
  currentUser: { role: Role; id?: number } | null | undefined,
  targetUser: { role: Role; id: number }
): AccountEditPermission {
  if (!currentUser) {
    return {
      canEdit: false,
      canDeactivate: false,
      canChangeRole: false,
      canResetPassword: false,
      reason: "Not logged in.",
    };
  }

  if (currentUser.role === "superuser" || targetUser.role === "superuser") {
    return {
      canEdit: false,
      canDeactivate: false,
      canChangeRole: false,
      canResetPassword: false,
      reason: "Platform accounts cannot be edited from tenant management.",
    };
  }

  if (currentUser.role === "staff") {
    return {
      canEdit: false,
      canDeactivate: false,
      canChangeRole: false,
      canResetPassword: false,
      reason: "Staff members cannot manage user accounts.",
    };
  }

  const isSelf = currentUser.id === targetUser.id;

  // Protect owner accounts: no tenant user (owner or admin) can modify another owner
  if (targetUser.role === "owner" && !isSelf) {
    return {
      canEdit: false,
      canDeactivate: false,
      canChangeRole: false,
      canResetPassword: false,
      reason: "Owners are managed by the platform administrator",
    };
  }

  if (currentUser.role === "admin") {
    if (targetUser.role === "admin" && !isSelf) {
      return {
        canEdit: false,
        canDeactivate: false,
        canChangeRole: false,
        canResetPassword: false,
        reason: "Only owners can manage admins",
      };
    }
    if (isSelf) {
      return {
        canEdit: true,
        canDeactivate: false,
        canChangeRole: false,
        canResetPassword: true,
        reason: "You cannot deactivate or change the role of your own account.",
      };
    }
    return {
      canEdit: true,
      canDeactivate: true,
      canChangeRole: true,
      canResetPassword: true,
    };
  }

  if (currentUser.role === "owner") {
    if (isSelf) {
      return {
        canEdit: true,
        canDeactivate: false,
        canChangeRole: false,
        canResetPassword: false, // Owner changes password in Settings / Account
        reason: "You cannot deactivate or change the role of your own account.",
      };
    }
    return {
      canEdit: true,
      canDeactivate: true,
      canChangeRole: true,
      canResetPassword: true,
    };
  }

  return {
    canEdit: false,
    canDeactivate: false,
    canChangeRole: false,
    canResetPassword: false,
  };
}

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;

  return {
    role,
    isOwner: role === "owner",
    isAdmin: role === "admin",
    isStaff: role === "staff",
    isSuperuser: role === "superuser",
    canManageServices: canManageServices(role),
    canManageTherapists: canManageTherapists(role),
    canManageStaff: canManageStaff(role),
    canDelete: canDelete(role),
    canSeeRevenue: canSeeRevenue(role),
    canManagePlatform: canManagePlatform(role),
    canEditAccount: (targetUser: { role: Role; id: number }) => canEditAccount(user, targetUser),
    allowedRoles: getAllowedRolesForCaller(role),
  };
}
