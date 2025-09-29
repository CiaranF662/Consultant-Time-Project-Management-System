import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import BudgetOverview from '@/app/components/projects/budget/BudgetOverview';

export default async function BudgetPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Only Growth Team can access budget overview
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <BudgetOverview />
    </DashboardLayout>
  );
}