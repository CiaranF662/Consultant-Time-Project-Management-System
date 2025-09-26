import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';

import DashboardLayout from '@/app/(features)/dashboard/components/DashboardLayout';
import ProjectBudgetDetails from '@/app/(features)/budget/components/ProjectBudgetDetails';


// #region Types
/**
 * Props passed to the ProjectBudgetPage.
 * In Next.js 13+ (App Router), params is always a plain object, not a Promise.
 */
interface PageProps {
  params: { projectId: string };
}
// #endregion Types

// #region Page Component
/**
 * Server component page to display budget details for a project.
 * - Verifies authentication
 * - Restricts access to Growth Team role
 * - Renders project budget details
 */
export default async function ProjectBudgetPage({ params }: PageProps) {
  // #region Authentication
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Only Growth Team can access budget details
  if (session.user.role !== UserRole.GROWTH_TEAM) {
    redirect('/dashboard');
  }
  // #endregion Authentication

  // #region Params
  const { projectId } = params; // ✅ changed: removed unnecessary await
  // #endregion Params

  // #region Render
  return (
    <DashboardLayout>
      <ProjectBudgetDetails projectId={projectId} />
    </DashboardLayout>
  );
  // #endregion Render
}
// #endregion Page Component
