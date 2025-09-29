'use client';

import { useState, useEffect } from 'react';
import { FaClock, FaCheckCircle, FaTimesCircle, FaUser, FaProjectDiagram } from 'react-icons/fa';
import { formatHours, formatDate } from '@/lib/dates';
import { SectionLoader } from '@/app/components/ui/LoadingSpinner';

interface PendingAllocation {
  id: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  totalHours: number;
  createdAt: Date;
  consultant: {
    name: string;
    email: string;
  };
  phase: {
    name: string;
    project: {
      title: string;
    };
  };
}

interface PendingWeeklyRequest {
  id: string;
  planningStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedHours: number;
  weekStartDate: Date;
  weekEndDate: Date;
  consultant: {
    name: string;
    email: string;
  };
  phaseAllocation: {
    phase: {
      name: string;
      project: {
        title: string;
      };
    };
  };
}

export default function PendingRequestsView() {
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocation[]>([]);
  const [pendingWeeklyRequests, setPendingWeeklyRequests] = useState<PendingWeeklyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'allocations' | 'weekly'>('allocations');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      // Fetch pending allocations that PM created (waiting for Growth Team approval)
      const allocationsResponse = await fetch('/api/projects/managed/pending-allocations');
      if (allocationsResponse.ok) {
        const allocationsData = await allocationsResponse.json();
        setPendingAllocations(allocationsData);
      }

      // Fetch pending weekly planning requests from team members in PM's projects
      const weeklyResponse = await fetch('/api/projects/managed/pending-weekly-plans');
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        setPendingWeeklyRequests(weeklyData);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <SectionLoader text="Loading pending requests..." />;
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <FaClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-orange-900">Allocation Requests</h3>
              <p className="text-sm text-orange-700">{pendingAllocations.length} awaiting Growth Team approval</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FaUser className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Weekly Planning</h3>
              <p className="text-sm text-blue-700">{pendingWeeklyRequests.length} team submissions pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('allocations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'allocations'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaClock />
            Allocation Requests ({pendingAllocations.length})
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
            Weekly Planning ({pendingWeeklyRequests.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {activeTab === 'allocations' ? (
          <div>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Phase Allocation Requests</h3>
              <p className="text-sm text-gray-600">Your allocation requests waiting for Growth Team approval</p>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingAllocations.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <FaCheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-gray-600">No pending allocation requests</p>
                  <p className="text-xs text-gray-500 mt-1">All your allocations have been processed</p>
                </div>
              ) : (
                pendingAllocations.map((allocation) => (
                  <div key={allocation.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FaProjectDiagram className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {allocation.phase.project.title}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          Phase: {allocation.phase.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Consultant: <span className="font-medium text-blue-600">{allocation.consultant.name || allocation.consultant.email}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Requested: {formatDate(allocation.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatHours(allocation.totalHours)}
                          </div>
                          <div className="text-xs text-gray-500">hours</div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <FaClock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Weekly Planning Submissions</h3>
              <p className="text-sm text-gray-600">Team member weekly hour plans awaiting your review</p>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingWeeklyRequests.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <FaCheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-gray-600">No pending weekly plans</p>
                  <p className="text-xs text-gray-500 mt-1">All team submissions have been reviewed</p>
                </div>
              ) : (
                pendingWeeklyRequests.map((request) => (
                  <div key={request.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FaUser className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {request.consultant.name || request.consultant.email}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {request.phaseAllocation.phase.project.title} - {request.phaseAllocation.phase.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Week: {formatDate(request.weekStartDate)} - {formatDate(request.weekEndDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatHours(request.proposedHours)}
                          </div>
                          <div className="text-xs text-gray-500">hours planned</div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <FaClock className="w-3 h-3 mr-1" />
                          Pending Review
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 rounded">
            <FaClock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm">
            <p className="text-blue-800 font-medium mb-1">About Pending Requests</p>
            <p className="text-blue-700 text-xs leading-relaxed">
              <strong>Allocation Requests:</strong> Phase allocations you've created need Growth Team approval before consultants can plan their weekly hours.
              <br />
              <strong>Weekly Planning:</strong> Team members submit their weekly hour plans which automatically get approved and appear on the resource timeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}