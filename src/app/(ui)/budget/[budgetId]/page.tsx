/**
 * Server component page to display budget details for a project.
 * - Verifies authentication
 * - Restricts access to Growth Team role
 * - Renders project budget details
 */

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import ProjectBudgetDetails from '@/app/components/dashboard/ProjectBudgetDetails';


// #region Types
interface PageProps {
  params: { projectId: string };
}
// #endregion Types

// #region Page Component
export default async function ProjectBudgetPage({ params }: PageProps) {
  // Authentication
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Only Growth Team can access budget details
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }

  // Params
  const { projectId } = params; 

  // #region Render
  return (
    <DashboardLayout>
      <ProjectBudgetDetails projectId={projectId} />
    </DashboardLayout>
  );
  // #endregion Render
}
// #endregion Page Component
