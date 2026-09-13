const RIGHTS_ELIGIBLE_ROLES = ["ict_sub_admin", "corporate_admin"];

function hasRight(user, flagName) {
  if (!user) return false;
  if (user.role.name === "super_admin") return true;
  if (RIGHTS_ELIGIBLE_ROLES.includes(user.role.name)) return !!user[flagName];
  return false;
}

export function isAdmin(user) {
  return !!user;
}

export function canAutoPublish(user) {
  if (!user) return false;
  return ["super_admin", "corporate_super_admin", "corporate_admin"].includes(user.role.name);
}

export function canApprove(user) {
  if (!user) return false;
  if (["super_admin", "corporate_super_admin", "corporate_admin"].includes(user.role.name)) return true;
  if (user.role.name === "ict_sub_admin") return !!user.can_approve;
  return false;
}

export function canManageOrgUnits(user) {
  return hasRight(user, "can_manage_org_units");
}

export function canManageUsers(user) {
  return hasRight(user, "can_manage_users");
}

export function canCreateCategories(user) {
  if (!user) return false;
  if (["super_admin", "web_admin"].includes(user.role.name)) return true;
  return hasRight(user, "can_manage_tags");
}

export function canDeleteCategories(user) {
  if (!user) return false;
  if (user.role.name === "super_admin") return true;
  return hasRight(user, "can_manage_tags");
}

export function canPin(user) {
  return hasRight(user, "can_pin");
}

export function canAssignPostScope(user) {
  if (!user) return false;
  if (user.role.name === "super_admin") return true;
  return hasRight(user, "can_assign_post_scope");
}

export function canAssignApproveScope(user) {
  if (!user) return false;
  if (["super_admin", "corporate_super_admin"].includes(user.role.name)) return true;
  return hasRight(user, "can_assign_approve_scope");
}

export function isCorporateSuperAdmin(user) {
  if (!user) return false;
  return user.role.name === "corporate_super_admin";
}

export function canViewAuditLog(user) {
  if (!user) return false;
  return ["super_admin", "corporate_super_admin"].includes(user.role.name);
}

export function canViewAllNotices(user) {
  if (!user) return false;
  return ["super_admin", "ict_sub_admin", "corporate_admin"].includes(user.role.name);
}

export function canDeleteAnyNotice(user) {
  if (!user) return false;
  if (user.role.name === "super_admin") return true;
  return hasRight(user, "can_delete_notice");
}