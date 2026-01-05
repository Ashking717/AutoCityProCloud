// User Roles
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  ACCOUNTANT = 'ACCOUNTANT',
  VIEWER = 'VIEWER',
}

// Permissions for each role
export const RolePermissions = {
  [UserRole.SUPERADMIN]: {
    canManageAllOutlets: true,
    canCreateOutlets: true,
    canDeleteOutlets: true,
    canManageUsers: true,
    canViewAllReports: true,
    canManageInventory: true,
    canProcessSales: true,
    canProcessPurchases: true,
    canManageAccounting: true,
    canViewFinancials: true,
  },
  [UserRole.ADMIN]: {
    canManageAllOutlets: false, // Only their assigned outlet
    canCreateOutlets: false,
    canDeleteOutlets: false,
    canManageUsers: true, // Within their outlet
    canViewAllReports: true, // Within their outlet
    canManageInventory: true,
    canProcessSales: true,
    canProcessPurchases: true,
    canManageAccounting: true,
    canViewFinancials: true,
  },
  [UserRole.MANAGER]: {
    canManageAllOutlets: false,
    canCreateOutlets: false,
    canDeleteOutlets: false,
    canManageUsers: false,
    canViewAllReports: true,
    canManageInventory: true,
    canProcessSales: true,
    canProcessPurchases: true,
    canManageAccounting: false,
    canViewFinancials: true,
  },
  [UserRole.CASHIER]: {
    canManageAllOutlets: false,
    canCreateOutlets: false,
    canDeleteOutlets: false,
    canManageUsers: false,
    canViewAllReports: false,
    canManageInventory: false,
    canProcessSales: true,
    canProcessPurchases: false,
    canManageAccounting: false,
    canViewFinancials: false,
  },
  [UserRole.ACCOUNTANT]: {
    canManageAllOutlets: false,
    canCreateOutlets: false,
    canDeleteOutlets: false,
    canManageUsers: false,
    canViewAllReports: true,
    canManageInventory: false,
    canProcessSales: false,
    canProcessPurchases: true,
    canManageAccounting: true,
    canViewFinancials: true,
  },
  [UserRole.VIEWER]: {
    canManageAllOutlets: false,
    canCreateOutlets: false,
    canDeleteOutlets: false,
    canManageUsers: false,
    canViewAllReports: true,
    canManageInventory: false,
    canProcessSales: false,
    canProcessPurchases: false,
    canManageAccounting: false,
    canViewFinancials: true,
  },
};

// Check if user has specific permission
export function hasPermission(role: UserRole, permission: keyof typeof RolePermissions[UserRole]) {
  return RolePermissions[role]?.[permission] ?? false;
}

// Check if user can access a specific outlet
export function canAccessOutlet(
  userRole: UserRole,
  userOutletId: string | null,
  targetOutletId: string
): boolean {
  // Superadmin can access all outlets
  if (userRole === UserRole.SUPERADMIN) {
    return true;
  }
  
  // Other users can only access their assigned outlet
  return userOutletId === targetOutletId;
}
