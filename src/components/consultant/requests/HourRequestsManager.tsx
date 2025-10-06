'use client';

import { useState } from 'react';
import { FaPlus, FaClock, FaExchangeAlt, FaEye } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import CreateHourRequestModal from './CreateHourRequestModal';
import HourRequestDetailModal from './HourRequestDetailModal';

interface HourRequest {
  id: string;
  changeType: 'ADJUSTMENT' | 'SHIFT';
  originalHours: number;
  requestedHours: number;
  fromConsultantId: string | null;
  toConsultantId: string | null;
  shiftHours: number | null;
  phaseId: string | null;
  weekNumber: number | null;
  year: number | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date | string;
  updatedAt: Date | string;
  requester: {
    id: string;
    name: string | null;
    email: string | null;
  };
  approver: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface PhaseAllocation {
  id: string;
  totalHours: number;
  phase: {
    id: string;
    name: string;
    project: {
      id: string;
      title: string;
      consultants: Array<{
        userId: string;
        user: {
          id: string;
          name: string | null;
          email: string | null;
        };
      }>;
    };
  };
}

interface HourRequestsManagerProps {
  data: {
    requests: HourRequest[];
    phaseAllocations: PhaseAllocation[];
  };
  userId: string;
  userName: string;
}

export default function HourRequestsManager({ data, userId, userName }: HourRequestsManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HourRequest | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-foreground';
    }
  };

  const getChangeTypeIcon = (type: string) => {
    return type === 'ADJUSTMENT' ? <FaClock /> : <FaExchangeAlt />;
  };

  const getChangeTypeLabel = (type: string) => {
    return type === 'ADJUSTMENT' ? 'Hour Adjustment' : 'Hour Transfer';
  };

  const getChangeDescription = (request: HourRequest) => {
    if (request.changeType === 'ADJUSTMENT') {
      const change = request.requestedHours - request.originalHours;
      const action = change > 0 ? 'Increase' : 'Decrease';
      return `${action} by ${formatHours(Math.abs(change))}`;
    } else {
      return `Transfer ${formatHours(request.shiftHours || 0)} hours`;
    }
  };

  const pendingRequests = data.requests.filter(r => r.status === 'PENDING');
  const completedRequests = data.requests.filter(r => r.status !== 'PENDING');

  const handleRequestCreated = () => {
    window.location.reload(); // Simple refresh - in production, you'd update state
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hour Change Requests</h1>
          <p className="text-lg text-gray-600">Manage your allocation change requests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <FaPlus />
          New Request
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
            </div>
            <FaClock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-foreground">{data.requests.length}</p>
            </div>
            <FaExchangeAlt className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Phases</p>
              <p className="text-2xl font-bold text-foreground">{data.phaseAllocations.length}</p>
            </div>
            <FaClock className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border mb-8">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-foreground">Pending Requests</h2>
          </div>
          <div className="divide-y">
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                      {getChangeTypeIcon(request.changeType)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {getChangeTypeLabel(request.changeType)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getChangeDescription(request)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created {new Date(request.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Reason:</strong> {request.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Requests History */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-foreground">Request History</h2>
        </div>
        
        {data.requests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No requests yet. Create your first hour change request to get started.</p>
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {data.requests.map((request) => (
              <div key={request.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full text-sm ${
                      request.changeType === 'ADJUSTMENT' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {getChangeTypeIcon(request.changeType)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {getChangeTypeLabel(request.changeType)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {getChangeDescription(request)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(request.createdAt).toLocaleDateString()} • 
                        {request.approver && ` Reviewed by ${request.approver.name || request.approver.email}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateHourRequestModal
          phaseAllocations={data.phaseAllocations}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onRequestCreated={handleRequestCreated}
        />
      )}

      {selectedRequest && (
        <HourRequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}