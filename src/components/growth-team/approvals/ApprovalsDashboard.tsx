'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaEdit, FaClock, FaUser, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import PhaseAllocationApproval from './PhaseAllocationApproval';
import WeeklyPlanApproval from './WeeklyPlanApproval';
import HourChangeApproval from './HourChangeApproval';
import { ComponentLoading } from '@/components/ui/LoadingSpinner';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  createdAt: Date;
  consultant: {
    id: string;
    name: string | null;
    email: string | null;
  };
  phase: {
    id: string;
    name: string;
    description?: string | null;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      title: string;
    };
  };
}

interface WeeklyAllocation {
  id: string;
  proposedHours: number | null;
  weekNumber: number;
  year: number;
  weekStartDate: Date;
  weekEndDate: Date;
  consultantId: string;
  consultant: {
    id: string;
    name: string | null;
    email: string | null;
  };
  phaseAllocation: {
    id: string;
    totalHours: number;
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
        name: string | null;
        email: string | null;
      };
      totalProposed: number;
      allocations: WeeklyAllocation[];
      weeklyWorkload: {
        totalApprovedHours: number;
        projects: Array<{
          projectTitle: string;
          phaseName: string;
          hours: number;
        }>;
      };
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
    name: string | null;
    email: string | null;
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
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

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

        // Show success message
        const allocation = phaseAllocations.find(a => a.id === allocationId);
        const consultantName = allocation?.consultant.name || allocation?.consultant.email || 'Consultant';
        const phaseName = allocation?.phase.name || 'Phase';
        const actionMessage = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified';
        showNotification('success', `✓ ${phaseName} allocation for ${consultantName} has been ${actionMessage} successfully!`);
      } else {
        const error = await response.json();
        showNotification('error', error.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error processing phase approval:', error);
      showNotification('error', 'Failed to process approval');
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
        // Show success message
        const allocation = weeklyAllocations.raw.find(a => a.id === allocationId);
        const consultantName = allocation?.consultant.name || allocation?.consultant.email || 'Consultant';
        const actionMessage = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified';
        showNotification('success', `✓ Weekly allocation for ${consultantName} has been ${actionMessage} successfully!`);

        // Refresh weekly allocations
        const refreshResponse = await fetch('/api/approvals/weekly-allocations');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setWeeklyAllocations(refreshData);
        }
      } else {
        const error = await response.json();
        showNotification('error', error.error || 'Failed to process approval');
        throw new Error(error.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Error processing weekly approval:', error);
      showNotification('error', 'Failed to process approval');
      throw error; // Re-throw so modal knows it failed
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(allocationId);
        return newSet;
      });
    }
  };

  // Handle batch approval for a group of allocations
  const handleBatchApproval = async (allocationIds: string[]) => {
    // Mark all as processing
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      allocationIds.forEach(id => newSet.add(id));
      return newSet;
    });

    try {
      // Build allocations array with their proposed hours
      const allocationsToApprove = allocationIds.map(id => {
        const allocation = weeklyAllocations.raw.find(a => a.id === id);
        return {
          id,
          approvedHours: allocation?.proposedHours || 0
        };
      });

      const response = await fetch('/api/approvals/weekly-allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: allocationsToApprove,
          defaultAction: 'approve'
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification('success', `✓ Successfully approved ${result.updated} allocation${result.updated !== 1 ? 's' : ''}!`);

        // Refresh weekly allocations
        const refreshResponse = await fetch('/api/approvals/weekly-allocations');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setWeeklyAllocations(refreshData);
        }
      } else {
        const error = await response.json();
        showNotification('error', error.error || 'Failed to process batch approval');
      }
    } catch (error) {
      console.error('Error processing batch approval:', error);
      showNotification('error', 'Failed to process batch approval');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        allocationIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  // Handle hour change request approval
  const handleHourChangeApproval = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set(prev).add(requestId));

    try {
      const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
      const response = await fetch(`/api/approvals/hour-changes/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Show success message
        const request = hourChangeRequests.find(r => r.id === requestId);
        const consultantName = request?.requester.name || request?.requester.email || 'Consultant';
        const actionMessage = action === 'approve' ? 'approved' : 'rejected';
        showNotification('success', `✓ Hour change request from ${consultantName} has been ${actionMessage} successfully!`);

        // Remove from pending list
        setHourChangeRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        const error = await response.json();
        showNotification('error', error.error || 'Failed to process hour change request');
      }
    } catch (error) {
      console.error('Error processing hour change approval:', error);
      showNotification('error', 'Failed to process hour change request');
    }

    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
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
        <ComponentLoading message="Loading approvals..." />
      ) : (
        <>
          {/* Phase Allocations Tab */}
          {activeTab === 'phase' && (
            <PhaseAllocationApproval
              phaseAllocations={phaseAllocations}
              onApproval={handlePhaseApproval}
              processingIds={processingIds}
            />
          )}

          {/* Hour Change Requests Tab */}
          {activeTab === 'hour-changes' && (
            <HourChangeApproval
              hourChangeRequests={hourChangeRequests}
              onApproval={handleHourChangeApproval}
              processingIds={processingIds}
            />
          )}

          {/* Weekly Allocations Tab */}
          {activeTab === 'weekly' && (
            <WeeklyPlanApproval
              weeklyAllocations={weeklyAllocations}
              onApproval={handleWeeklyApproval}
              onBatchApproval={handleBatchApproval}
              processingIds={processingIds}
            />
          )}
        </>
      )}

      {/* Success/Error Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <FaCheckCircle /> : <FaTimes />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            className="ml-2 hover:opacity-70"
          >
            <FaTimes />
          </button>
        </div>
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