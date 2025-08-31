'use client';

import { useState } from 'react';
import { FaPlus, FaCalendarAlt, FaUsers, FaClock, FaEdit, FaTrash } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import PhaseCreationModal from './PhaseCreationModal';
import PhaseAllocationModal from './PhaseAllocationModal';
import EditPhaseModal from '../EditPhaseModal';

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date | string;
  endDate: Date | string;
}

interface PhaseAllocation {
  id: string;
  consultantId: string;
  totalHours: number;
  consultant: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Phase {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | string;
  endDate: Date | string;
  sprints: Sprint[];
  allocations: PhaseAllocation[];
}

interface Project {
  id: string;
  title: string;
  budgetedHours: number;
  phases: Phase[];
  sprints: Sprint[];
  consultants: Array<{
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
}

interface PhasePlanningDashboardProps {
  data: {
    projects: Project[];
    allConsultants: Array<{
      id: string;
      name: string | null;
      email: string | null;
    }>;
  };
  userId: string;
}

export default function PhasePlanningDashboard({ data, userId }: PhasePlanningDashboardProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(
    data.projects.length > 0 ? data.projects[0] : null
  );
  const [showPhaseCreation, setShowPhaseCreation] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState<Phase | null>(null);
  const [showEditPhase, setShowEditPhase] = useState<Phase | null>(null);

  if (data.projects.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Phase Planning</h1>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No projects found where you are assigned as Product Manager.</p>
        </div>
      </div>
    );
  }

  const handlePhaseCreated = () => {
    window.location.reload(); // Simple refresh - in production, you'd want to update state
  };

  const handleAllocationUpdated = () => {
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Phase Planning</h1>
          <p className="text-lg text-gray-600">Manage project phases and resource allocation</p>
        </div>
      </div>

      {/* Project Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <select
          value={selectedProject?.id || ''}
          onChange={(e) => {
            const project = data.projects.find(p => p.id === e.target.value);
            setSelectedProject(project || null);
          }}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {data.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <>
          {/* Project Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-900">{formatHours(selectedProject.budgetedHours)}</p>
                </div>
                <FaClock className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Phases</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProject.phases.length}</p>
                </div>
                <FaCalendarAlt className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sprints</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProject.sprints.length}</p>
                </div>
                <FaCalendarAlt className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedProject.consultants.length}</p>
                </div>
                <FaUsers className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Phases Section */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Project Phases</h2>
              <button
                onClick={() => setShowPhaseCreation(true)}
                className="inline-flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <FaPlus />
                Add Phase
              </button>
            </div>

            <div className="p-4">
              {selectedProject.phases.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No phases created yet. Click "Add Phase" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedProject.phases.map((phase) => {
                    const totalAllocated = phase.allocations.reduce((sum, alloc) => sum + alloc.totalHours, 0);
                    
                    return (
                      <div key={phase.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{phase.name}</h3>
                            {phase.description && (
                              <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>
                                {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                              </span>
                              <span>
                                Sprints: {phase.sprints.map(s => s.sprintNumber).join(', ')}
                              </span>
                              <span>
                                Allocated: {formatHours(totalAllocated)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowAllocationModal(phase)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Manage Allocations"
                            >
                              <FaUsers />
                            </button>
                            <button
                              onClick={() => setShowEditPhase(phase)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                              title="Edit Phase"
                            >
                              <FaEdit />
                            </button>
                          </div>
                        </div>

                        {/* Phase Allocations */}
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Resource Allocations</h4>
                          {phase.allocations.length === 0 ? (
                            <p className="text-sm text-gray-500">No allocations set</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {phase.allocations.map((allocation) => (
                                <div key={allocation.id} className="bg-gray-50 p-2 rounded text-sm">
                                  <div className="font-medium">
                                    {allocation.consultant.name || allocation.consultant.email}
                                  </div>
                                  <div className="text-gray-600">
                                    {formatHours(allocation.totalHours)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {showPhaseCreation && selectedProject && (
        <PhaseCreationModal
          project={selectedProject}
          onClose={() => setShowPhaseCreation(false)}
          onPhaseCreated={handlePhaseCreated}
        />
      )}

      {showAllocationModal && selectedProject && (
        <PhaseAllocationModal
          phase={showAllocationModal}
          project={selectedProject}
          allConsultants={data.allConsultants}
          onClose={() => setShowAllocationModal(null)}
          onAllocationUpdated={handleAllocationUpdated}
        />
      )}

      {showEditPhase && (
        <EditPhaseModal
          phase={showEditPhase}
          onClose={() => setShowEditPhase(null)}
          onPhaseUpdated={handlePhaseCreated}
        />
      )}
    </div>
  );
}