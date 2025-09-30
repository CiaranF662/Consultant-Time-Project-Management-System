import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api-auth';
import { PrismaClient } from '@prisma/client';

import { prisma } from "@/lib/prisma";

// GET a specific weekly allocation by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ allocationsId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { allocationsId } = await params;

  try {
    const allocation = await prisma.weeklyAllocation.findUnique({
      where: { id: allocationsId },
      include: {
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: {
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      }
    });

    if (!allocation) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    // Check if user has access to this allocation
    if (allocation.consultantId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    return NextResponse.json(allocation);
  } catch (error) {
    console.error('Error fetching allocation:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch allocation' }), { status: 500 });
  }
}

// PUT update a specific weekly allocation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ allocationsId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { allocationsId } = await params;

  try {
    const body = await request.json();
    const { proposedHours } = body;

    // First check if allocation exists and user has access
    const existing = await prisma.weeklyAllocation.findUnique({
      where: { id: allocationsId }
    });

    if (!existing) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    if (existing.consultantId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    const allocation = await prisma.weeklyAllocation.update({
      where: { id: allocationsId },
      data: {
        proposedHours,
        planningStatus: 'PENDING' // Reset to pending when consultant updates
      },
      include: {
        phaseAllocation: {
          include: {
            phase: {
              include: {
                project: {
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(allocation);
  } catch (error) {
    console.error('Error updating allocation:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update allocation' }), { status: 500 });
  }
}

// DELETE a specific weekly allocation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ allocationsId: string }> }
) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { session, user } = auth;

  const { allocationsId } = await params;

  try {
    // First check if allocation exists and user has access
    const existing = await prisma.weeklyAllocation.findUnique({
      where: { id: allocationsId }
    });

    if (!existing) {
      return new NextResponse(JSON.stringify({ error: 'Allocation not found' }), { status: 404 });
    }

    if (existing.consultantId !== session.user.id) {
      return new NextResponse(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
    }

    await prisma.weeklyAllocation.delete({
      where: { id: allocationsId }
    });

    return new NextResponse(JSON.stringify({ message: 'Allocation deleted successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete allocation' }), { status: 500 });
  }
}