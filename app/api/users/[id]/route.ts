import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import ActivityLog from '@/lib/models/ActivityLog';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { UserRole } from '@/lib/types/roles';

// DELETE /api/users/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = verifyToken(token);

    // Permission check
    if (
      currentUser.role !== UserRole.SUPERADMIN &&
      currentUser.role !== UserRole.ADMIN
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userToDelete = await User.findById(params.id);

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cannot delete yourself
    if (userToDelete._id.toString() === currentUser.userId) {
      return NextResponse.json(
        { error: 'You cannot delete yourself' },
        { status: 400 }
      );
    }

    // ADMIN-specific restrictions
    if (currentUser.role === UserRole.ADMIN) {
      // Admin must belong to an outlet
      if (!currentUser.outletId) {
        return NextResponse.json(
          { error: 'Admin user has no outlet assigned' },
          { status: 403 }
        );
      }

      // Target user must belong to same outlet
      if (!userToDelete.outletId) {
        return NextResponse.json(
          { error: 'You cannot delete a superadmin user' },
          { status: 403 }
        );
      }

      if (userToDelete.outletId.toString() !== currentUser.outletId) {
        return NextResponse.json(
          { error: 'You can only delete users in your outlet' },
          { status: 403 }
        );
      }

      // Admins cannot delete admins or superadmins
      if (
        userToDelete.role === UserRole.SUPERADMIN ||
        userToDelete.role === UserRole.ADMIN
      ) {
        return NextResponse.json(
          { error: 'You cannot delete admin users' },
          { status: 403 }
        );
      }
    }

    await User.findByIdAndDelete(params.id);

    await ActivityLog.create({
      userId: currentUser.userId,
      username: currentUser.email,
      actionType: 'delete',
      module: 'users',
      description: `Deleted user: ${userToDelete.email}`,
      outletId: currentUser.outletId ?? undefined,
      timestamp: new Date(),
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
