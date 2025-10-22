import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireGrowthTeam, isAuthError } from '@/lib/api-auth';

import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  try {
    const { userId } = await params;
    const { role } = await request.json();

    if (!Object.values(UserRole).includes(role)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid role' }), { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update user role' }), { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireGrowthTeam();
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  try {
    const { userId } = await params;

    // Prevent deleting yourself
    if (userId === session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Cannot delete your own account' }), { status: 400 });
    }

    // Delete user and all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete related records first to avoid foreign key constraints
      await tx.weeklyAllocation.deleteMany({ where: { consultantId: userId } });
      await tx.phaseAllocation.deleteMany({ where: { consultantId: userId } });
      await tx.hourChangeRequest.deleteMany({ where: { consultantId: userId } });
      await tx.consultantsOnProjects.deleteMany({ where: { userId: userId } });
      await tx.notification.deleteMany({ where: { userId: userId } });
      await tx.session.deleteMany({ where: { userId: userId } });
      await tx.account.deleteMany({ where: { userId: userId } });
      
      // Set productManagerId to null for projects managed by this user
      await tx.project.updateMany({
        where: { productManagerId: userId },
        data: { productManagerId: null }
      });
      
      // Set approver fields to null where this user was the approver
      await tx.phaseAllocation.updateMany({
        where: { approvedBy: userId },
        data: { approvedBy: null }
      });
      
      await tx.weeklyAllocation.updateMany({
        where: { approvedBy: userId },
        data: { approvedBy: null }
      });
      
      await tx.weeklyAllocation.updateMany({
        where: { plannedBy: userId },
        data: { plannedBy: null }
      });
      
      await tx.hourChangeRequest.updateMany({
        where: { approverId: userId },
        data: { approverId: null }
      });
      
      // Finally delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete user' }), { status: 500 });
  }
}