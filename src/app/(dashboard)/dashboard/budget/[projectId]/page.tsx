import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProjectBudgetDetails from '@/app/components/budget/ProjectBudgetDetails';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectBudgetPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Only Growth Team can access budget details
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  const { projectId } = await params;

  return (
    <DashboardLayout>
      <ProjectBudgetDetails projectId={projectId} />
    </DashboardLayout>
  );
}