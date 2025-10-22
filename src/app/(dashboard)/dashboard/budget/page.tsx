import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import BudgetOverview from '@/components/growth-team/budget/BudgetOverview';

export default async function BudgetPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  // Only Growth Team can access budget overview
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  return (
    
      <BudgetOverview />
    
  );
}