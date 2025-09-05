'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { FaArrowLeft, FaUsers, FaPlus, FaEdit, FaClock, FaDollarSign } from 'react-icons/fa';
import { UserRole, Sprint, User, Phase, Project } from '@prisma/client';

import AddPhaseForm from '@/app/components/AddPhaseForm';
import PhaseAllocationForm from '@/app/components/allocation/PhaseAllocationForm';
import EditPhaseModal from '@/app/components/EditPhaseModal';
import EditProjectModal from '@/app/components/EditProjectModal';
import BudgetTracker from '@/app/components/allocation/BudgetTracker';
import { generateColorFromString } from '@/lib/colors';
import DashboardLayout from '@/app/components/DashboardLayout';

// Define comprehensive types
interface PhaseAllocation {
  id: string;
  consultantId: string;
  consultantName: string;
  hours: number; // Changed from allocatedHours to hours
  usedHours: number;
}

interface PhaseWithAllocations extends Phase {
  sprints: Sprint[];
  phaseAllocations: PhaseAllocation[];
  _count: { phaseAllocations: number };
}

interface ConsultantsOnProject {
  userId: string;
  user: { name: string | null };
}

interface ProjectWithDetails extends Project {
  consultants: ConsultantsOnProject[];
  phases: PhaseWithAllocations[];
  sprints: Sprint[];
  productManager?: User;
  budgetedHours: number;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(date));
}

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
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
  const [editPhaseModal, setEditPhaseModal] = useState<{ isOpen: boolean; phase: Phase | null }>({
    isOpen: false,
    phase: null,
  });

  // Unwrap params Promise
  useEffect(() => {
    params.then((unwrappedParams) => {
      setProjectId(unwrappedParams.projectId);
    });
  }, [params]);

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const { data } = await axios.get(`/api/projects/${projectId}`);
      setProject(data);
    } catch (error) {
      console.error("Failed to fetch project details", error);
      setProject(null);
    }
  }, [projectId]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (status === 'authenticated' && projectId) {
      fetchProjectDetails();
    }
  }, [status, router, fetchProjectDetails, projectId]);
  
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
    return <div className="text-center p-12">Loading...</div>;
  }
  
  if (!session?.user) {
    return <div className="text-center p-12">Loading session...</div>;
  }

  const sprintsInPhases = new Set(project.phases.flatMap(p => p.sprints.map(s => s.id)));
  const unassignedSprints = project.sprints.filter(s => !sprintsInPhases.has(s.id));
  const isProductManager = session.user.id === project.productManagerId;
  const isGrowthTeam = session.user.role === UserRole.GROWTH_TEAM;
  const canManageProject = isGrowthTeam || isProductManager;
  const canManageAllocations = isProductManager; // Only Product Managers can manage allocations

  // Calculate project-level statistics
  const totalAllocatedHours = project.phases.reduce((total, phase) => {
    return total + (phase.phaseAllocations?.reduce((phaseTotal, allocation) => 
      phaseTotal + allocation.hours, 0) || 0); // Changed from allocatedHours to hours
  }, 0);

  const totalUsedHours = project.phases.reduce((total, phase) => {
    return total + (phase.phaseAllocations?.reduce((phaseTotal, allocation) => 
      phaseTotal + allocation.usedHours, 0) || 0);
  }, 0);

  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen w-full">
        <div className="container mx-auto p-4 md:p-8">
          
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600">
              <FaArrowLeft /> Back to Dashboard
            </Link>
          </div>

          {/* Project Header */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800">{project.title}</h1>
                <p className="text-gray-600 mt-2 max-w-prose">{project.description || 'No description provided.'}</p>
              </div>
              {canManageProject && (
                <div className="flex items-center gap-2 ml-4">
                  <button 
                    onClick={() => setIsEditProjectModalOpen(true)} 
                    className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    <FaEdit />
                    Edit Project
                  </button>
                  <button 
                    onClick={() => setIsAddPhaseModalOpen(true)} 
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <FaPlus />
                    Add Phase
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div className="flex items-center gap-2">
                  <FaClock className="text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="font-medium">{formatDate(project.startDate)} - {project.endDate ? formatDate(project.endDate) : 'Ongoing'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FaDollarSign className="text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Budget</div>
                    <div className="font-medium">{project.budgetedHours}h</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FaUsers className="text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600">Team Size</div>
                    <div className="font-medium">{project.consultants.length} consultants</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-sm text-gray-600">Allocation</div>
                    <div className="font-medium">{totalAllocatedHours}h / {project.budgetedHours}h</div>
                    <div className="text-xs text-gray-500">({Math.round((totalAllocatedHours / project.budgetedHours) * 100)}%)</div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {project.productManager && (
                    <div>
                      <span className="text-gray-600">Product Manager:</span>
                      <span className={`ml-2 rounded-md px-2 py-1 text-xs font-semibold ${generateColorFromString(project.productManagerId || '')}`}>
                        {project.productManager.name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Team:</span>
                    <div className="flex flex-wrap gap-1">
                      {project.consultants.map(c => (
                        <span key={c.userId} className={`rounded-md px-2 py-1 text-xs font-semibold ${generateColorFromString(c.userId)}`}>
                          {c.user.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Phases */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Project Phases</h2>
                
                {project.phases.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                    <div className="text-gray-500 mb-4">No phases defined yet</div>
                    {canManageProject && (
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
                    {project.phases.map(phase => {
                      const phaseAllocatedHours = phase.phaseAllocations?.reduce((sum, allocation) => 
                        sum + allocation.hours, 0) || 0; // Changed from allocatedHours to hours
                      const phaseUsedHours = phase.phaseAllocations?.reduce((sum, allocation) => 
                        sum + allocation.usedHours, 0) || 0;

                      return (
                        <div key={phase.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                          <div className="p-4 border-b flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-800">{phase.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">{formatDate(phase.startDate)} - {formatDate(phase.endDate)}</p>
                              {phase.description && (
                                <p className="text-sm text-gray-600 mt-2">{phase.description}</p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <div className="text-right text-sm">
                                <div className="font-medium">{phaseAllocatedHours}h allocated</div>
                                <div className="text-gray-500">{phaseUsedHours}h used</div>
                              </div>
                              
                              {canManageProject && (
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => setEditPhaseModal({ isOpen: true, phase })}
                                    className="p-2 text-gray-400 hover:text-blue-600"
                                  >
                                    <FaEdit />
                                  </button>
                                  {canManageAllocations && (
                                    <button 
                                      onClick={() => openAllocationModal(phase)}
                                      className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                    >
                                      Manage Hours
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Phase Allocations */}
                          <div className="p-4">
                            {phase.phaseAllocations && phase.phaseAllocations.length > 0 ? (
                              <div>
                                <h4 className="font-medium text-gray-800 mb-3">Resource Allocation</h4>
                                <div className="space-y-2">
                                  {phase.phaseAllocations.map((allocation) => (
                                    <div key={allocation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-sm font-medium ${generateColorFromString(allocation.consultantId)}`}>
                                          {allocation.consultantName}
                                        </span>
                                        <div className="text-sm text-gray-600">
                                          {allocation.hours}h allocated {/* Changed from allocatedHours to hours */}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-4">
                                        <div className="text-sm">
                                          <span className="text-gray-600">{allocation.usedHours}h used</span>
                                          <span className="text-gray-400 mx-2">•</span>
                                          <span className="text-gray-600">{allocation.hours - allocation.usedHours}h remaining</span> {/* Changed from allocatedHours to hours */}
                                        </div>
                                        
                                        {/* Progress bar */}
                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                          <div
                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                            style={{
                                              width: `${Math.min(100, (allocation.usedHours / Math.max(allocation.hours, 1)) * 100)}%` // Changed from allocatedHours to hours
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Phase Summary */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium">Phase Total:</span>
                                    <span>{phaseUsedHours}h / {phaseAllocatedHours}h</span>
                                  </div>
                                  <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className="bg-green-500 h-3 rounded-full transition-all"
                                      style={{
                                        width: `${Math.min(100, (phaseUsedHours / Math.max(phaseAllocatedHours, 1)) * 100)}%`
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <div className="text-gray-500 mb-2">No resource allocations yet</div>
                                {canManageAllocations && (
                                  <button 
                                    onClick={() => openAllocationModal(phase)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  >
                                    Allocate Resources →
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Associated Sprints */}
                            {phase.sprints.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600 mb-2">Associated Sprints:</div>
                                <div className="flex flex-wrap gap-2">
                                  {phase.sprints
                                    .sort((a, b) => a.sprintNumber - b.sprintNumber)
                                    .map((sprint) => (
                                      <span key={sprint.id} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                        Sprint {sprint.sprintNumber}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unassigned Sprints */}
                {unassignedSprints.length > 0 && (
                  <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b">
                      <h3 className="font-bold text-lg text-gray-800">Unassigned Sprints</h3>
                      <p className="text-sm text-gray-500">These sprints need to be assigned to phases</p>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {unassignedSprints
                          .sort((a, b) => a.sprintNumber - b.sprintNumber)
                          .map((sprint) => (
                            <div key={sprint.id} className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
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
                <div className="bg-white rounded-lg shadow-md border p-4">
                  <h3 className="font-bold text-gray-800 mb-4">Project Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Phases:</span>
                      <span className="font-medium">{project.phases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sprints:</span>
                      <span className="font-medium">{project.sprints.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Members:</span>
                      <span className="font-medium">{project.consultants.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unassigned Sprints:</span>
                      <span className={`font-medium ${unassignedSprints.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
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
        </div>

        {/* Modals */}
        {projectId && (
          <AddPhaseForm 
            projectId={projectId} 
            isOpen={isAddPhaseModalOpen} 
            onClose={() => {
              setIsAddPhaseModalOpen(false);
              fetchProjectDetails();
            }} 
          />
        )}

        {isEditProjectModalOpen && project && (
          <EditProjectModal
            project={project}
            onClose={() => {
              setIsEditProjectModalOpen(false);
              fetchProjectDetails();
            }}
          />
        )}

        {editPhaseModal.isOpen && editPhaseModal.phase && (
          <EditPhaseModal 
            phase={editPhaseModal.phase}
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
    </DashboardLayout>
  );
}