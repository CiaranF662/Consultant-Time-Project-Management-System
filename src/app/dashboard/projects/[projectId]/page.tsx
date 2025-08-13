import { PrismaClient, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { authOptions } from '@/lib/auth';
import AddPhaseForm from '@/app/components/AddPhaseForm';

const prisma = new PrismaClient();

async function getProjectDetails(projectId: string, userId: string) {
  // Logic for a Growth Team member to see any project, or a consultant to see their own.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const whereClause = {
    id: projectId,
    ...(user?.role !== UserRole.GROWTH_TEAM && { consultantId: userId }),
  };

  const project = await prisma.project.findFirst({
    where: whereClause,
    include: {
      sprints: {
        orderBy: {
          sprintNumber: 'asc',
        },
      },
      phases: {
        orderBy: {
          startDate: 'asc',
        },
        // Include the sprints related to each phase
        include: {
          sprints: {
            orderBy: {
              sprintNumber: 'asc',
            },
          },
        },
      },
    },
  });
  return project;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default async function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const project = await getProjectDetails(params.projectId, session.user.id);

  if (!project) {
    notFound();
  }

  // Group sprints by the phase they belong to
  const sprintsInPhases = new Set(project.phases.flatMap(p => p.sprints.map(s => s.id)));
  const unassignedSprints = project.sprints.filter(s => !sprintsInPhases.has(s.id));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            <FaArrowLeft />
            Back to Dashboard
          </Link>
        </div>

        {/* Project Header */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{project.title}</h1>
          <p className="text-gray-600 mt-2 max-w-prose">{project.description || 'No description provided.'}</p>
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
            <strong>Start Date:</strong> {formatDate(project.startDate)}
            {project.endDate && (
              <span className="ml-4">
                <strong>End Date:</strong> {formatDate(project.endDate)}
              </span>
            )}
          </div>
        </div>
        
        {session?.user.role === UserRole.GROWTH_TEAM && (
          <AddPhaseForm projectId={project.id} />
        )}

        {/* --- PHASES & SPRINTS VIEW --- */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Project Roadmap</h2>
          <div className="space-y-6">
            {/* Render each phase and its sprints */}
            {project.phases.map(phase => (
              <div key={phase.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b">
                  <h3 className="font-bold text-lg text-gray-800">{phase.name}</h3>
                  <p className="text-sm text-gray-500">{formatDate(phase.startDate)} - {formatDate(phase.endDate)}</p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {phase.sprints.map(sprint => (
                    <li key={sprint.id} className="p-4 flex justify-between items-center text-sm">
                      <p>Sprint {sprint.sprintNumber}</p>
                      <p className="text-gray-500">{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</p>
                    </li>
                  ))}
                   {phase.sprints.length === 0 && <p className="p-4 text-sm text-gray-400">No sprints assigned to this phase.</p>}
                </ul>
              </div>
            ))}
            
            {/* Render unassigned sprints */}
            {unassignedSprints.length > 0 && (
               <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b">
                  <h3 className="font-bold text-lg text-gray-800">Unassigned Sprints</h3>
                </div>
                <ul className="divide-y divide-gray-100">
                  {unassignedSprints.map(sprint => (
                    <li key={sprint.id} className="p-4 flex justify-between items-center text-sm">
                      <p>Sprint {sprint.sprintNumber}</p>
                      <p className="text-gray-500">{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}