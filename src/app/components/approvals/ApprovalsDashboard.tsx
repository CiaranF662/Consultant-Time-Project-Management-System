'use client';

import { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaEdit, FaClock, FaUser, FaExclamationTriangle } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  createdAt: Date;
  consultant: {
    id: string;
    name: string;
    email: string;
  };
  phase: {
    id: string;
    name: string;
    project: {
      id: string;
      title: string;
    };
  };
}

interface WeeklyAllocation {
  id: string;
  proposedHours: number;
  weekNumber: number;
  year: number;
  weekStartDate: Date;
  weekEndDate: Date;
  consultant: {
    id: string;
    name: string;
    email: string;
  };
  phaseAllocation: {
    id: string;
    phase: {
      id: string;
      name: string;
      project: {
        id: string;
        title: string;
      };
    };
  };
}

interface GroupedWeeklyAllocations {
  [weekKey: string]: {
    [consultantId: string]: {
      consultant: {
        id: string;
        name: string;
        email: string;
      };
      totalProposed: number;
      allocations: WeeklyAllocation[];
    };
  };
}

interface HourChangeRequest {
  id: string;
  changeType: 'ADJUSTMENT' | 'SHIFT';
  requestedHours: number;
  reason: string;
  createdAt: Date;
  requester: {
    id: string;
    name: string;
    email: string;
  };
  phaseAllocation?: {
    id: string;
    phase: {
      id: string;
      name: string;
      project: {
        id: string;
        title: string;
      };
    };
  } | null;
}

interface ApprovalsDashboardProps {
  userRole?: string;
  pendingAllocations?: PhaseAllocation[];
  pendingHourChanges?: HourChangeRequest[];
  pendingWeeklyAllocations?: {
    grouped: GroupedWeeklyAllocations;
    raw: WeeklyAllocation[];
  };
  showFullInterface?: boolean;
}

export default function ApprovalsDashboard({
  userRole,
  pendingAllocations = [],
  pendingHourChanges = [],
  pendingWeeklyAllocations,
  showFullInterface = false
}: ApprovalsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'phase' | 'weekly' | 'hour-changes'>('phase');
  const [phaseAllocations, setPhaseAllocations] = useState<PhaseAllocation[]>(pendingAllocations);
  const [hourChangeRequests, setHourChangeRequests] = useState<HourChangeRequest[]>(pendingHourChanges);
  const [weeklyAllocations, setWeeklyAllocations] = useState<{
    grouped: GroupedWeeklyAllocations;
    raw: WeeklyAllocation[];
  }>(pendingWeeklyAllocations || { grouped: {}, raw: [] });
  const [loading, setLoading] = useState(!showFullInterface);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [modifyModal, setModifyModal] = useState<{
    isOpen: boolean;
    allocation?: PhaseAllocation | null;
    type: 'phase' | 'weekly' | 'hour-change';
  }>({ isOpen: false, type: 'phase' });
  const [modifyValues, setModifyValues] = useState<{
    hours: number;
    reason: string;
  }>({ hours: 0, reason: '' });

  // Fetch pending approvals (only when not using props)
  useEffect(() => {
    if (showFullInterface) {
      // Data provided via props, no need to fetch
      setLoading(false);
      return;
    }

    const fetchApprovals = async () => {
      setLoading(true);
      try {
        if (activeTab === 'phase') {
          const response = await fetch('/api/approvals/phase-allocations');
          if (response.ok) {
            const data = await response.json();
            setPhaseAllocations(data);
          }
        } else if (activeTab === 'hour-changes') {
          const response = await fetch('/api/approvals/hour-changes');
          if (response.ok) {
            const data = await response.json();
            setHourChangeRequests(data);
          }
        } else {
          const response = await fetch('/api/approvals/weekly-allocations');
          if (response.ok) {
            const data = await response.json();
            console.log('Weekly allocations data:', data);
            setWeeklyAllocations(data);
          } else {
            console.error('Failed to fetch weekly allocations:', response.status, response.statusText);
          }
        }
      } catch (error) {
        console.error('Error fetching approvals:', error);
      }
      setLoading(false);
    };

    fetchApprovals();
  }, [activeTab, showFullInterface]);

  // Handle phase allocation approval
  const handlePhaseApproval = async (allocationId: string, action: 'approve' | 'reject' | 'modify', data?: any) => {
    setProcessingIds(prev => new Set(prev).add(allocationId));

    try {
      const response = await fetch(`/api/approvals/phase-allocations/${allocationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });

      if (response.ok) {
        // Remove from pending list
        setPhaseAllocations(prev => prev.filter(alloc => alloc.id !== allocationId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error processing phase approval:', error);
      alert('Failed to process approval');
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(allocationId);
      return newSet;
    });
  };

  // Handle weekly allocation approval
  const handleWeeklyApproval = async (allocationId: string, action: 'approve' | 'reject' | 'modify', data?: any) => {
    setProcessingIds(prev => new Set(prev).add(allocationId));

    try {
      const response = await fetch(`/api/approvals/weekly-allocations/${allocationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });

      if (response.ok) {
        // Refresh weekly allocations
        const refreshResponse = await fetch('/api/approvals/weekly-allocations');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setWeeklyAllocations(refreshData);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error processing weekly approval:', error);
      alert('Failed to process approval');
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(allocationId);
      return newSet;
    });
  };

  // Handle batch approval
  const handleBatchApproval = async (weekKey: string, action: 'approve' | 'reject') => {
    const weekData = weeklyAllocations.grouped[weekKey];
    if (!weekData) return;

    const allocationIds = Object.values(weekData)
      .flatMap(consultant => consultant.allocations.map(alloc => ({ id: alloc.id })));

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      allocationIds.forEach(alloc => newSet.add(alloc.id));
      return newSet;
    });

    try {
      const response = await fetch('/api/approvals/weekly-allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: allocationIds,
          defaultAction: action
        })
      });

      if (response.ok) {
        // Refresh weekly allocations
        const refreshResponse = await fetch('/api/approvals/weekly-allocations');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setWeeklyAllocations(refreshData);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to process batch approval');
      }
    } catch (error) {
      console.error('Error processing batch approval:', error);
      alert('Failed to process batch approval');
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      allocationIds.forEach(alloc => newSet.delete(alloc.id));
      return newSet;
    });
  };

  // Handle hour change request approval
  const handleHourChangeApproval = async (requestId: string, action: 'approve' | 'reject', data?: any) => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      const response = await fetch(`/api/approvals/hour-changes/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });

      if (response.ok) {
        // Remove from pending list
        setHourChangeRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to process hour change request');
      }
    } catch (error) {
      console.error('Error processing hour change approval:', error);
      alert('Failed to process hour change request');
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  if (userRole !== 'GROWTH_TEAM') {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <FaExclamationTriangle className="inline mr-2" />
          Access denied. This dashboard is only available to Growth Team members.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Approvals Dashboard</h1>
        <p className="text-lg text-gray-600">Review and approve phase allocations and weekly plans</p>
      </div>

      {/* Tab Switcher */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('phase')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'phase'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaClock />
              Phase Allocations ({phaseAllocations.length})
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'weekly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaUser />
              Weekly Plans ({Object.keys(weeklyAllocations.grouped).length} weeks)
            </button>
            {showFullInterface && (
              <button
                onClick={() => setActiveTab('hour-changes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'hour-changes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaEdit />
                Hour Changes ({hourChangeRequests.length})
              </button>
            )}
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Phase Allocations Tab */}
          {activeTab === 'phase' && (
            <div className="space-y-6">
              {phaseAllocations.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <FaCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-600">No phase allocations pending approval.</p>
                </div>
              ) : (
                phaseAllocations.map((allocation) => (
                  <div key={allocation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {allocation.phase.project.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Phase: {allocation.phase.name}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-bold text-blue-600">
                                {formatHours(allocation.totalHours)}
                              </div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">
                                Hours Requested
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <span>
                              <span className="font-medium">Consultant:</span> {allocation.consultant.name || allocation.consultant.email}
                            </span>
                            <span>
                              <span className="font-medium">Requested:</span> {new Date(allocation.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) {
                              handlePhaseApproval(allocation.id, 'reject', { rejectionReason: reason });
                            }
                          }}
                          disabled={processingIds.has(allocation.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaTimes className="w-4 h-4" />
                          Reject
                        </button>

                        <button
                          onClick={() => {
                            setModifyValues({ hours: allocation.totalHours, reason: '' });
                            setModifyModal({ isOpen: true, allocation, type: 'phase' });
                          }}
                          disabled={processingIds.has(allocation.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaEdit className="w-4 h-4" />
                          Modify
                        </button>

                        <button
                          onClick={() => handlePhaseApproval(allocation.id, 'approve')}
                          disabled={processingIds.has(allocation.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaCheck className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Hour Change Requests Tab */}
          {activeTab === 'hour-changes' && (
            <div className="space-y-6">
              {hourChangeRequests.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <FaCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-600">No hour change requests pending approval.</p>
                </div>
              ) : (
                hourChangeRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {request.phaseAllocation?.phase?.project?.title || 'Unknown Project'}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Phase: {request.phaseAllocation?.phase?.name || 'Unknown Phase'}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <div className={`text-2xl font-bold ${
                                request.changeType === 'ADJUSTMENT' ? 'text-blue-600' : 'text-purple-600'
                              }`}>
                                {formatHours(request.requestedHours)}
                              </div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide">
                                {request.changeType} Request
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <span>
                              <span className="font-medium">Consultant:</span> {request.requester.name || request.requester.email}
                            </span>
                            <span>
                              <span className="font-medium">Requested:</span> {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Reason:</span> {request.reason}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => {
                            const reason = prompt('Enter rejection reason:');
                            if (reason) {
                              handleHourChangeApproval(request.id, 'reject', { rejectionReason: reason });
                            }
                          }}
                          disabled={processingIds.has(request.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaTimes className="w-4 h-4" />
                          Reject
                        </button>

                        <button
                          onClick={() => handleHourChangeApproval(request.id, 'approve')}
                          disabled={processingIds.has(request.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaCheck className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Weekly Allocations Tab */}
          {activeTab === 'weekly' && (
            <div className="space-y-6">
              {Object.keys(weeklyAllocations.grouped).length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <FaCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="text-gray-600">No weekly plans pending approval.</p>
                </div>
              ) : (
                (() => {
                  // Group allocations by project → phase → sprint → week → consultant
                  const groupedByPhase = weeklyAllocations.raw.reduce((acc, allocation) => {
                    const projectId = allocation.phaseAllocation.phase.project.id;
                    const projectTitle = allocation.phaseAllocation.phase.project.title;
                    const phaseId = allocation.phaseAllocation.phase.id;
                    const phaseName = allocation.phaseAllocation.phase.name;
                    const weekKey = new Date(allocation.weekStartDate).toISOString().split('T')[0];

                    // Use the same sprint matching logic as the timeline and WeeklyPlannerEnhanced
                    const weekStart = new Date(allocation.weekStartDate);
                    const sprints = allocation.phaseAllocation.phase.sprints || [];

                    // Find which sprint this week belongs to (same logic as getSprintInfoForWeek)
                    function getSprintInfoForWeek(weekStart: Date, sprints: any[]) {
                      const sortedSprints = sprints.sort((a, b) => a.sprintNumber - b.sprintNumber);

                      for (const sprint of sortedSprints) {
                        const sprintStart = new Date(sprint.startDate);
                        const sprintEnd = new Date(sprint.endDate);

                        if (weekStart >= sprintStart && weekStart <= sprintEnd) {
                          return { sprint, sprintNumber: sprint.sprintNumber };
                        }
                      }

                      // If no exact match, return the first sprint
                      return sprints.length > 0 ? { sprint: sprints[0], sprintNumber: sprints[0].sprintNumber } : null;
                    }

                    const sprintInfo = getSprintInfoForWeek(weekStart, sprints);
                    const sprintNumber = sprintInfo ? sprintInfo.sprintNumber : 1;
                    const matchingSprint = sprintInfo ? sprintInfo.sprint : null;
                    const sprintKey = `${phaseId}-S${sprintNumber}`;

                    if (!acc[projectId]) {
                      acc[projectId] = {
                        title: projectTitle,
                        phases: {}
                      };
                    }

                    if (!acc[projectId].phases[phaseId]) {
                      acc[projectId].phases[phaseId] = {
                        name: phaseName,
                        sprints: {},
                        totalProposed: 0,
                        consultantCount: new Set()
                      };
                    }

                    if (!acc[projectId].phases[phaseId].sprints[sprintKey]) {
                      acc[projectId].phases[phaseId].sprints[sprintKey] = {
                        sprintNumber: sprintNumber,
                        sprintData: matchingSprint,
                        weeks: {},
                        totalHours: 0
                      };
                    }

                    if (!acc[projectId].phases[phaseId].sprints[sprintKey].weeks[weekKey]) {
                      acc[projectId].phases[phaseId].sprints[sprintKey].weeks[weekKey] = {
                        weekStartDate: allocation.weekStartDate,
                        allocations: [],
                        totalHours: 0
                      };
                    }

                    acc[projectId].phases[phaseId].sprints[sprintKey].weeks[weekKey].allocations.push(allocation);
                    acc[projectId].phases[phaseId].sprints[sprintKey].weeks[weekKey].totalHours += allocation.proposedHours || 0;
                    acc[projectId].phases[phaseId].sprints[sprintKey].totalHours += allocation.proposedHours || 0;
                    acc[projectId].phases[phaseId].totalProposed += allocation.proposedHours || 0;
                    acc[projectId].phases[phaseId].consultantCount.add(allocation.consultantId);

                    return acc;
                  }, {} as any);

                  return Object.entries(groupedByPhase).map(([projectId, project]) => (
                    <div key={projectId} className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900">{project.title}</h2>
                            <p className="text-sm text-gray-600 mt-1">
                              {Object.keys(project.phases).length} phase(s) with pending approvals
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                // Bulk approve all allocations in this project
                                const allAllocationIds = Object.values(project.phases)
                                  .flatMap((phase: any) => Object.values(phase.sprints))
                                  .flatMap((sprint: any) => Object.values(sprint.weeks))
                                  .flatMap((week: any) => week.allocations.map((alloc: any) => alloc.id));

                                allAllocationIds.forEach(id => {
                                  const allocation = weeklyAllocations.raw.find(a => a.id === id);
                                  if (allocation) {
                                    handleWeeklyApproval(id, 'approve', { approvedHours: allocation.proposedHours });
                                  }
                                });
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                            >
                              <FaCheck className="w-4 h-4" />
                              Approve Project
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {Object.entries(project.phases).map(([phaseId, phase]) => (
                          <div key={phaseId} className="border border-gray-200 rounded-lg">
                            <div className="bg-blue-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900">{phase.name}</h3>
                                  <p className="text-sm text-gray-600">
                                    {formatHours(phase.totalProposed)} total hours • {phase.consultantCount.size} consultant(s) • {Object.keys(phase.sprints).length} sprint{Object.keys(phase.sprints).length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    // Bulk approve all allocations in this phase
                                    const phaseAllocationIds = Object.values(phase.sprints)
                                      .flatMap((sprint: any) => Object.values(sprint.weeks))
                                      .flatMap((week: any) => week.allocations.map((alloc: any) => alloc.id));

                                    phaseAllocationIds.forEach(id => {
                                      const allocation = weeklyAllocations.raw.find(a => a.id === id);
                                      if (allocation) {
                                        handleWeeklyApproval(id, 'approve', { approvedHours: allocation.proposedHours });
                                      }
                                    });
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                  <FaCheck className="w-4 h-4" />
                                  Approve Phase
                                </button>
                              </div>
                            </div>

                            <div className="p-4 space-y-4">
                              {Object.entries(phase.sprints)
                                .sort(([, sprintA], [, sprintB]) => {
                                  return sprintA.sprintNumber - sprintB.sprintNumber;
                                })
                                .map(([sprintKey, sprint]) => (
                                <div key={sprintKey} className="border border-gray-300 rounded-lg">
                                  <div className="bg-yellow-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="font-medium text-gray-900">
                                          Sprint {sprint.sprintNumber}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {sprint.sprintData && (
                                            <>
                                              {new Date(sprint.sprintData.startDate).toLocaleDateString()} - {new Date(sprint.sprintData.endDate).toLocaleDateString()} •
                                            </>
                                          )}
                                          Total: {formatHours(sprint.totalHours)} • {Object.keys(sprint.weeks).length} week{Object.keys(sprint.weeks).length !== 1 ? 's' : ''}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => {
                                          Object.values(sprint.weeks).forEach((week: any) => {
                                            week.allocations.forEach((allocation: any) => {
                                              handleWeeklyApproval(allocation.id, 'approve', { approvedHours: allocation.proposedHours });
                                            });
                                          });
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
                                      >
                                        <FaCheck className="w-4 h-4" />
                                        Approve Sprint
                                      </button>
                                    </div>
                                  </div>

                                  <div className="p-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {Object.entries(sprint.weeks)
                                        .sort(([weekA], [weekB]) => weekA.localeCompare(weekB))
                                        .map(([weekKey, week]) => (
                                        <div key={weekKey} className="bg-gray-50 rounded-lg p-3">
                                          <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-sm font-medium text-gray-900">
                                              Week of {new Date(week.weekStartDate).toLocaleDateString()}
                                            </h5>
                                            <span className="text-sm text-gray-600">
                                              {formatHours(week.totalHours)}
                                            </span>
                                          </div>

                                          <div className="space-y-2">
                                            {week.allocations.map((allocation: any) => {
                                              const consultant = allocation.consultant;

                                              return (
                                                <div key={allocation.id} className="flex items-center justify-between bg-white rounded-md p-2 border border-gray-200">
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                      <span className="text-white text-xs font-medium">
                                                        {(consultant.name || consultant.email || '?').charAt(0).toUpperCase()}
                                                      </span>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-medium text-gray-900">
                                                        {consultant.name || consultant.email}
                                                      </p>
                                                      <p className="text-xs text-gray-500">
                                                        {formatHours(allocation.proposedHours)}
                                                      </p>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => {
                                                        const reason = prompt('Enter rejection reason:');
                                                        if (reason) {
                                                          handleWeeklyApproval(allocation.id, 'reject', { rejectionReason: reason });
                                                        }
                                                      }}
                                                      disabled={processingIds.has(allocation.id)}
                                                      className="p-1 text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                      title="Reject"
                                                    >
                                                      <FaTimes className="w-3 h-3" />
                                                    </button>

                                                    <button
                                                      onClick={() => {
                                                        const approvedHours = prompt('Enter approved hours:', allocation.proposedHours.toString());
                                                        if (approvedHours && parseFloat(approvedHours) >= 0) {
                                                          handleWeeklyApproval(allocation.id, 'modify', { approvedHours: parseFloat(approvedHours) });
                                                        }
                                                      }}
                                                      disabled={processingIds.has(allocation.id)}
                                                      className="p-1 text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                      title="Modify"
                                                    >
                                                      <FaEdit className="w-3 h-3" />
                                                    </button>

                                                    <button
                                                      onClick={() => handleWeeklyApproval(allocation.id, 'approve', { approvedHours: allocation.proposedHours })}
                                                      disabled={processingIds.has(allocation.id)}
                                                      className="p-1 text-white bg-green-600 border border-transparent rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                      title="Approve"
                                                    >
                                                      <FaCheck className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          )}
        </>
      )}

      {/* Modify Modal */}
      {modifyModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Modify Hours
                </h3>
                <button
                  onClick={() => setModifyModal({ isOpen: false, type: 'phase' })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              {modifyModal.allocation && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {modifyModal.allocation.phase.project.title} - {modifyModal.allocation.phase.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Consultant: {modifyModal.allocation.consultant.name || modifyModal.allocation.consultant.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    Original Request: {formatHours(modifyModal.allocation.totalHours)}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modified Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={modifyValues.hours}
                    onChange={(e) => setModifyValues(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter modified hours"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Modification
                  </label>
                  <textarea
                    value={modifyValues.reason}
                    onChange={(e) => setModifyValues(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Explain why you're modifying the hours..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setModifyModal({ isOpen: false, type: 'phase' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (modifyModal.allocation && modifyValues.hours > 0) {
                      handlePhaseApproval(
                        modifyModal.allocation.id,
                        'modify',
                        {
                          modifiedHours: modifyValues.hours,
                          modificationReason: modifyValues.reason || 'No reason provided'
                        }
                      );
                      setModifyModal({ isOpen: false, type: 'phase' });
                    }
                  }}
                  disabled={!modifyValues.hours || modifyValues.hours <= 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}