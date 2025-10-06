import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import UserManagement from '@/components/growth-team/users/UserManagement';
import { prisma } from '@/lib/prisma';

export default async function ManageUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Only Growth Team can access user management
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  // Fetch initial data server-side for better performance
  const [users, pendingUsers] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return <UserManagement initialData={{ users, pendingUsers }} />;
}
