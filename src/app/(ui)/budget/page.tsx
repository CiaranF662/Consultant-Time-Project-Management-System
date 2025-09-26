//secure server entry point (gatekeeper) for budget overview page
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import DashboardLayout from '@/app/(features)/dashboard/components/DashboardLayout';
import BudgetOverview from '@/app/(features)/budget/components/BudgetOverview';

export default async function BudgetPage() {
  const session = await getServerSession(authOptions); // Authentication check
  
  // Redirect to login if not authenticated
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Role-based access control- Only Growth Team can access budget overview
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <BudgetOverview />
    </DashboardLayout>
  );
}