import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ChangeStatus } from '@prisma/client';
import HourRequestsManager from '@/components/consultant/requests/HourRequestsManager';

import { prisma } from "@/lib/prisma";

async function getUserHourRequests(userId: string) {
  const requests = await prisma.hourChangeRequest.findMany({
    where: { consultantId: userId },
    include: {
      requester: {
        select: { id: true, name: true, email: true }
      },
      approver: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get user's phase allocations for creating new requests
  const phaseAllocations = await prisma.phaseAllocation.findMany({
    where: { consultantId: userId },
    include: {
      phase: {
        include: {
          project: {
            include: {
              consultants: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return { requests, phaseAllocations };
}

export default async function HourRequestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const data = await getUserHourRequests(session.user.id);

  return (
    
      <HourRequestsManager 
        data={data} 
        userId={session.user.id}
        userName={session.user.name || session.user.email || 'User'}
      />
    
  );
}