import { cookies } from 'next/headers';
import { verifyToken, JWTPayload } from './jwt';

export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

export async function requireAuth(): Promise<JWTPayload> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

export async function requireRole(allowedRoles: string[]): Promise<JWTPayload> {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden - Insufficient permissions');
  }
  
  return user;
}

export async function requireOutletAccess(outletId: string): Promise<JWTPayload> {
  const user = await requireAuth();
  
  // Superadmin can access all outlets
  if (user.role === 'SUPERADMIN') {
    return user;
  }
  
  // Check if user's outlet matches
  if (user.outletId !== outletId) {
    throw new Error('Forbidden - Cannot access this outlet');
  }
  
  return user;
}
