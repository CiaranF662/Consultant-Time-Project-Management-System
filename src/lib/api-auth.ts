import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import { prisma } from './prisma';
import { UserRole, ProjectRole } from '@prisma/client';
import type { Session } from 'next-auth';
import type { User } from '@prisma/client';

/**
 * Result type for authentication functions
 * Returns either the authenticated session/user or a NextResponse error
 */
export type AuthResult =
  | { session: Session; user: User }
  | NextResponse;

/**
 * Checks if the result is an error response
 */
export function isAuthError(result: AuthResult): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Require authentication for API routes
 * Returns authenticated session and user, or error response
 *
 * @param options.requireRole - Optional role requirement (GROWTH_TEAM or CONSULTANT)
 * @returns AuthResult - Either session/user or error response
 *
 * @example
 * const auth = await requireAuth();
 * if (isAuthError(auth)) return auth;
 * const { session, user } = auth;
 */
export async function requireAuth(
  options?: { requireRole?: UserRole }
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse(
      JSON.stringify({ error: 'Not authenticated' }),
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user) {
    return new NextResponse(
      JSON.stringify({ error: 'User not found' }),
      { status: 404 }
    );
  }

  if (options?.requireRole && user.role !== options.requireRole) {
    return new NextResponse(
      JSON.stringify({ error: 'Not authorized' }),
      { status: 403 }
    );
  }

  return { session, user };
}

/**
 * Require Growth Team role for API routes
 * Convenience wrapper around requireAuth with role check
 *
 * @returns AuthResult - Either session/user or error response
 *
 * @example
 * const auth = await requireGrowthTeam();
 * if (isAuthError(auth)) return auth;
 */
export async function requireGrowthTeam(): Promise<AuthResult> {
  return requireAuth({ requireRole: UserRole.GROWTH_TEAM });
}

/**
 * Check if a user is a Product Manager for a specific project
 *
 * @param userId - User ID to check
 * @param projectId - Project ID to check against
 * @returns boolean - True if user is PM for the project
 */
export async function checkIsProductManager(
  userId: string,
  projectId: string
): Promise<boolean> {
  const assignment = await prisma.consultantsOnProjects.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  });

  return assignment?.role === ProjectRole.PRODUCT_MANAGER;
}

/**
 * Require Product Manager role for a specific project
 *
 * @param userId - User ID to check
 * @param projectId - Project ID to check against
 * @returns boolean if authorized, NextResponse if not
 *
 * @example
 * const pmCheck = await requireProductManager(userId, projectId);
 * if (pmCheck !== true) return pmCheck; // It's an error response
 */
export async function requireProductManager(
  userId: string,
  projectId: string
): Promise<true | NextResponse> {
  const isPM = await checkIsProductManager(userId, projectId);

  if (!isPM) {
    return new NextResponse(
      JSON.stringify({ error: 'Only Product Managers can perform this action' }),
      { status: 403 }
    );
  }

  return true;
}

/**
 * Check if user is Growth Team member
 *
 * @param userId - User ID to check
 * @returns boolean - True if user is Growth Team
 */
export async function checkIsGrowthTeam(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  return user?.role === UserRole.GROWTH_TEAM;
}

/**
 * Check if user is assigned to a specific project (as any role)
 *
 * @param userId - User ID to check
 * @param projectId - Project ID to check against
 * @returns boolean - True if user is assigned to project
 */
export async function checkIsProjectMember(
  userId: string,
  projectId: string
): Promise<boolean> {
  const assignment = await prisma.consultantsOnProjects.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  });

  return !!assignment;
}

/**
 * Require user to be assigned to a specific project
 *
 * @param userId - User ID to check
 * @param projectId - Project ID to check against
 * @returns true if authorized, NextResponse if not
 */
export async function requireProjectMember(
  userId: string,
  projectId: string
): Promise<true | NextResponse> {
  const isMember = await checkIsProjectMember(userId, projectId);

  if (!isMember) {
    return new NextResponse(
      JSON.stringify({ error: 'Not authorized to access this project' }),
      { status: 403 }
    );
  }

  return true;
}

/**
 * Check if user owns a specific phase allocation
 *
 * @param userId - User ID to check
 * @param allocationId - Phase allocation ID
 * @returns boolean - True if user owns the allocation
 */
export async function checkOwnsPhaseAllocation(
  userId: string,
  allocationId: string
): Promise<boolean> {
  const allocation = await prisma.phaseAllocation.findUnique({
    where: { id: allocationId },
    select: { consultantId: true }
  });

  return allocation?.consultantId === userId;
}

/**
 * Check if user is Growth Team OR owns the allocation
 *
 * @param userId - User ID to check
 * @param allocationId - Phase allocation ID
 * @returns boolean - True if authorized
 */
export async function checkCanAccessAllocation(
  userId: string,
  allocationId: string
): Promise<boolean> {
  const isGrowthTeam = await checkIsGrowthTeam(userId);
  if (isGrowthTeam) return true;

  return checkOwnsPhaseAllocation(userId, allocationId);
}
