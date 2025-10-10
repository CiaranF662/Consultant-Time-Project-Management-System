'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { FaArrowLeft, FaUsers, FaPlus, FaEdit, FaClock, FaDollarSign, FaChartLine, FaProjectDiagram } from 'react-icons/fa';
import { UserRole, Sprint, User, Phase, Project } from '@prisma/client';

import PhaseCreationModal from '@/components/projects/product-manager/PhaseCreationModal';
import PhaseAllocationForm from '@/components/projects/allocations/PhaseAllocationForm';
import EditPhaseModal from '@/components/projects/product-manager/EditPhaseModal';
import EditProjectModal from '@/components/projects/growth-team/EditProjectModal';
import BudgetTracker from '@/components/projects/budget/BudgetTracker';
import PhaseStatusCard from '@/components/projects/phases/PhaseStatusCard';
import ProjectGanttChart from '@/components/projects/gantt/ProjectGanttChart';
import { generateColorFromString } from '@/lib/colors';
import { formatDate } from '@/lib/dates';
import { ComponentLoading } from '@/components/ui/LoadingSpinner';

// Define comprehensive types
interface PhaseAllocation {
  id: string;
  consultantId: string;
  consultantName: string;
  hours: number; // Changed from allocatedHours to hours
  plannedHours: number;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
}

interface PhaseWithAllocations extends Phase {
  sprints: Sprint[];
  phaseAllocations: PhaseAllocation[];
  allocations?: Array<{
    id: string;
    consultantId: string;
    totalHours: number;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason?: string | null;
    weeklyAllocations: Array<{
      id: string;
      plannedHours: number;
      weekStartDate: Date;
      weekEndDate: Date;
      weekNumber: number;
      year: number;
    }>;
  }>;
  _count: { phaseAllocations: number };
}

interface ConsultantsOnProject {
  userId: string;
  role?: string;
  allocatedHours?: number | null;
  user: { name: string | null };
}

interface ProjectWithDetails extends Project {
  consultants: ConsultantsOnProject[];
  phases: PhaseWithAllocations[];
  sprints: Sprint[];
  productManager?: User;
  budgetedHours: number;
}


export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { projectId } = use(params);

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [activeView, setActiveView] = useState<'details' | 'gantt'>('details');
  const [isAddPhaseModalOpen, setIsAddPhaseModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [allocationModal, setAllocationModal] = useState<{
    isOpen: boolean;
    phaseId: string | null;
    phaseName: string;
    existingAllocations: PhaseAllocation[];
  }>({
    isOpen: false,
    phaseId: null,
    phaseName: '',
    existingAllocations: []
  });
  const [editPhaseModal, setEditPhaseModal] = useState<{ isOpen: boolean; phase: PhaseWithAllocations | null }>({
    isOpen: false,
    phase: null,
  });

  const fetchProjectDetails = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}`);
      setProject(data);
    } catch (error) {
      console.error("Failed to fetch project details", error);
      setProject(null);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (status === 'authenticated') {
      fetchProjectDetails();
    }
  }, [status, router, fetchProjectDetails]);
  
  const handleDeletePhase = async (phaseId: string) => {
    if(confirm('Are you sure you want to delete this phase? This will remove all allocations and unassign its sprints.')) {
        if(confirm('Second confirmation: This action cannot be undone. Are you sure?')) {
            try {
                await axios.delete(`/api/phases/${phaseId}`);
                fetchProjectDetails();
                setEditPhaseModal({ isOpen: false, phase: null });
            } catch (error) {
                alert('Failed to delete phase.');
            }
        }
    }
  };

  const openAllocationModal = (phase: PhaseWithAllocations) => {
    setAllocationModal({
      isOpen: true,
      phaseId: phase.id,
      phaseName: phase.name,
      existingAllocations: phase.phaseAllocations || []
    });
  };

  const closeAllocationModal = () => {
    setAllocationModal({
      isOpen: false,
      phaseId: null,
      phaseName: '',
      existingAllocations: []
    });
    fetchProjectDetails();
  };

  if (status === 'loading' || !project) {
    return <ComponentLoading message="Loading project details..." />;
  }

  if (!session?.user) {
    return <ComponentLoading message="Loading session..." />;
  }

  const sprintsInPhases = new Set(project.phases.flatMap(p => p.sprints.map(s => s.id)));
  const unassignedSprints = project.sprints.filter(s => !sprintsInPhases.has(s.id));
  const isProductManager = session.user.id === project.productManagerId;
  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;
  const canManagePhases = isProductManager; // Only Product Managers can manage phases
  const canManageAllocations = isProductManager; // Only Product Managers can manage allocations

  // Calculate project-level statistics from phase allocations (for phase allocation display)
  const totalPhaseAllocatedHours = project.phases.reduce((total, phase) => {
    return total + (phase.phaseAllocations?.reduce((phaseTotal, allocation) =>
      phaseTotal + allocation.hours, 0) || 0);
  }, 0);

  // Calculate total from Growth Team's original allocations (for team allocation display)
  const totalGrowthTeamAllocatedHours = project.consultants.reduce((total, consultant) => {
    return total + (consultant.allocatedHours || 0);
  }, 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen w-full">
        <div className="container mx-auto p-4 md:p-8">

          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/dashboard/projects" className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              <FaArrowLeft /> Back to All Projects
            </Link>
          </div>

          {/* Project Header */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {activeView === 'details' ? project.title : `${project.title} - Timeline`}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-prose">
                  {activeView === 'details'
                    ? (project.description || 'No description provided.')
                    : 'Visual timeline showing project phases and their schedules'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {isGrowthTeam && (
                  <button
                    onClick={() => setIsEditProjectModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-white dark:bg-gray-700 px-4 py-2 text-sm font-semibold text-card-foreground shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <FaEdit />
                    Edit Project
                  </button>
                )}
                {canManagePhases && (
                  <button
                    onClick={() => setIsAddPhaseModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <FaPlus />
                    Add Phase
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                {/* Duration Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg">
                      <FaClock className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Duration</div>
                  <div className="text-sm font-bold text-blue-900 dark:text-blue-100 mt-1">
                    {formatDate(project.startDate)}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    to {project.endDate ? formatDate(project.endDate) : 'Ongoing'}
                  </div>
                </div>

                {/* Budget Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-green-500 dark:bg-green-600 rounded-lg">
                      <FaDollarSign className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">Total Budget</div>
                  <div className="text-xl font-bold text-green-900 dark:text-green-100">{project.budgetedHours}h</div>
                </div>

                {/* Team Size Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-500 dark:bg-purple-600 rounded-lg">
                      <FaUsers className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Team Size</div>
                  <div className="text-xl font-bold text-purple-900 dark:text-purple-100">{project.consultants.length}</div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">Consultants</div>
                </div>

                {/* Phase Allocation Card */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-orange-500 dark:bg-orange-600 rounded-lg">
                      <FaChartLine className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Phase Allocation</div>
                  <div className="text-xl font-bold text-orange-900 dark:text-orange-100">{totalPhaseAllocatedHours}h</div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">
                    of {totalGrowthTeamAllocatedHours}h ({totalGrowthTeamAllocatedHours > 0 ? Math.round((totalPhaseAllocatedHours / totalGrowthTeamAllocatedHours) * 100) : 0}%)
                  </div>
                </div>

                {/* Team Allocation Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-indigo-500 dark:bg-indigo-600 rounded-lg">
                      <FaProjectDiagram className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Team Allocation</div>
                  <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100">{totalGrowthTeamAllocatedHours}h</div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300">
                    of {project.budgetedHours}h ({Math.round((totalGrowthTeamAllocatedHours / project.budgetedHours) * 100)}%)
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-3">
                  {project.productManager && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Product Manager:</span>
                      <span className={`rounded-md px-3 py-1 text-sm font-semibold ${generateColorFromString(project.productManagerId || '')}`}>
                        {project.productManager.name}
                        {(() => {
                          const pmConsultant = project.consultants.find(c => c.userId === project.productManagerId);
                          const pmAllocatedHours = pmConsultant?.allocatedHours || 0;
                          return (
                            <span className="ml-2 text-xs bg-white dark:bg-gray-900 bg-opacity-30 dark:bg-opacity-30 px-1 py-0.5 rounded">
                              {pmAllocatedHours}h
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Team Members:</span>
                    <div className="flex flex-wrap gap-2">
                      {project.consultants.filter(c => c.role !== 'PRODUCT_MANAGER').map(c => (
                        <span key={c.userId} className={`rounded-md px-3 py-1 text-sm font-semibold ${generateColorFromString(c.userId)}`}>
                          {c.user.name}
                          <span className="ml-2 text-xs bg-white dark:bg-gray-900 bg-opacity-30 dark:bg-opacity-30 px-1 py-0.5 rounded">
                            {c.allocatedHours || 0}h
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* View Switcher */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'details', label: 'Project Details', icon: FaChartLine },
                  { key: 'gantt', label: 'Timeline View', icon: FaProjectDiagram }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveView(key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeView === key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Project Details View */}
          {activeView === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Phases */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Project Phases</h2>
                
                {project.phases.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <div className="text-muted-foreground mb-4">No phases defined yet</div>
                    {canManagePhases && (
                      <button
                        onClick={() => setIsAddPhaseModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <FaPlus />
                        Add First Phase
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {project.phases.map(phase => (
                      <PhaseStatusCard
                        key={phase.id}
                        phase={{
                          id: phase.id,
                          name: phase.name,
                          description: phase.description || undefined,
                          startDate: phase.startDate,
                          endDate: phase.endDate,
                          sprints: phase.sprints,
                          allocations: phase.allocations
                        }}
                        individualAllocations={phase.phaseAllocations}
                        showDetails={true}
                        showIndividualAllocations={true}
                        canManageProject={canManagePhases}
                        canManageAllocations={canManageAllocations}
                        currentUserId={session.user.id}
                        onEditPhase={() => setEditPhaseModal({ isOpen: true, phase })}
                        onManageAllocations={() => openAllocationModal(phase)}
                        className="shadow-md"
                      />
                    ))}
                  </div>
                )}

                {/* Unassigned Sprints */}
                {unassignedSprints.length > 0 && (
                  <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-lg text-foreground">Unassigned Sprints</h3>
                      <p className="text-sm text-muted-foreground">These sprints need to be assigned to phases</p>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {unassignedSprints
                          .sort((a, b) => a.sprintNumber - b.sprintNumber)
                          .map((sprint) => (
                            <div key={sprint.id} className="px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm">
                              <div className="font-medium">Sprint {sprint.sprintNumber}</div>
                              <div className="text-xs">{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column - Project Overview & Budget */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 space-y-6">
                {/* Project Overview */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-bold text-foreground mb-4">Project Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Phases:</span>
                      <span className="font-medium text-foreground">{project.phases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Sprints:</span>
                      <span className="font-medium text-foreground">{project.sprints.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Team Members:</span>
                      <span className="font-medium text-foreground">{project.consultants.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Unassigned Sprints:</span>
                      <span className={`font-medium ${unassignedSprints.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                        {unassignedSprints.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Budget Tracker */}
                <BudgetTracker projectId={project.id} />
              </div>
            </div>
          </div>
          )}

          {/* Gantt Timeline View */}
          {activeView === 'gantt' && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-foreground">Project Timeline</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Visual representation of project phases and their schedules</p>
              </div>
              <div className="p-4">
                <ProjectGanttChart
                  project={{
                    id: project.id,
                    title: project.title,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    phases: project.phases.map(phase => ({
                      id: phase.id,
                      name: phase.name,
                      startDate: phase.startDate,
                      endDate: phase.endDate,
                      sprints: phase.sprints,
                      allocations: phase.phaseAllocations?.map(allocation => ({
                        consultantId: allocation.consultantId,
                        consultantName: allocation.consultantName,
                        hours: allocation.hours
                      })) || []
                    }))
                  }}
                />
              </div>
            </div>
          )}

        {/* Modals */}
        {isAddPhaseModalOpen && project && (
          <PhaseCreationModal
            project={{
              id: project.id,
              title: project.title,
              sprints: project.sprints
            }}
            onClose={() => setIsAddPhaseModalOpen(false)}
            onPhaseCreated={() => {
              setIsAddPhaseModalOpen(false);
              fetchProjectDetails();
            }}
          />
        )}

        {isEditProjectModalOpen && project && (
          <EditProjectModal
            project={{
              ...project,
              consultants: project.consultants.map(c => ({
                ...c,
                allocatedHours: c.allocatedHours ?? undefined
              }))
            }}
            onClose={() => {
              setIsEditProjectModalOpen(false);
              fetchProjectDetails();
            }}
          />
        )}

        {editPhaseModal.isOpen && editPhaseModal.phase && project.sprints && (
          <EditPhaseModal 
            phase={editPhaseModal.phase}
            projectSprints={project.sprints || []}
            onClose={() => {
              setEditPhaseModal({ isOpen: false, phase: null });
              fetchProjectDetails();
            }}
            onDelete={() => handleDeletePhase(editPhaseModal.phase!.id)}
          />
        )}

        {allocationModal.isOpen && allocationModal.phaseId && projectId && (
          <PhaseAllocationForm
            projectId={projectId}
            phaseId={allocationModal.phaseId}
            phaseName={allocationModal.phaseName}
            isOpen={allocationModal.isOpen}
            onClose={closeAllocationModal}
            onSaved={closeAllocationModal}
            existingAllocations={allocationModal.existingAllocations}
          />
        )}
      </div>
    </div>
  );
}