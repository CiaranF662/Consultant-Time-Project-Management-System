'use client';

import { useState, useEffect } from 'react';
import { FaArrowLeft, FaClock, FaExchangeAlt, FaCheck, FaTimes, FaCheckCircle } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import axios from 'axios';
import DashboardLayout from '@/app/(features)/dashboard/components/DashboardLayout';

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
}

interface HourChangeApprovalsManagerProps {
  requests: HourRequest[];
  userId: string;
}

interface Notification {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

export default function HourChangeApprovalsManager({ requests, userId }: HourChangeApprovalsManagerProps) {
  //#region State
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<Notification>({ show: false, type: 'success', message: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //#endregion

  //#region Effects
  useEffect(() => {
    // Simulate loading for initial state
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);
  //#endregion

  //#region Helpers
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
  };

  const handleApproval = async (requestId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    try {
      await axios.patch(`/api/admin/hour-changes/${requestId}`, { status: newStatus });
      setProcessedRequests(prev => new Set(prev).add(requestId));
      const action = newStatus === 'APPROVED' ? 'approved' : 'rejected';
      showNotification('success', `✓ Hour change request ${action} successfully!`);
    } catch (err: any) {
      showNotification('error', err.response?.data?.error || 'Failed to update request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getChangeTypeIcon = (type: string) => type === 'ADJUSTMENT' ? <FaClock /> : <FaExchangeAlt />;
  const getChangeTypeLabel = (type: string) => type === 'ADJUSTMENT' ? 'Hour Adjustment' : 'Hour Transfer';
  const getChangeDescription = (request: HourRequest) => {
    if (request.changeType === 'ADJUSTMENT') {
      const change = request.requestedHours - request.originalHours;
      const action = change > 0 ? 'Increase' : 'Decrease';
      return `${action} by ${formatHours(Math.abs(change))}`;
    } else {
      return `Transfer ${formatHours(request.shiftHours || 0)} hours`;
    }
  };
  //#endregion

  //#region Derived Data
  const pendingRequests = requests.filter(req => !processedRequests.has(req.id));
  //#endregion

  //#region Loading / Error States
  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="text-red-600 text-center p-12">Error: {error}</div>
    </DashboardLayout>
  );
  //#endregion

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 relative">
        {/* Notification Toast */}
        {notification.show && (
          <NotificationToast notification={notification} onClose={() => setNotification(prev => ({ ...prev, show: false }))} />
        )}

        {/* Header */}
        <Header pendingCount={pendingRequests.length} />

        {/* Requests List */}
        <RequestList
          requests={pendingRequests}
          processingRequests={processingRequests}
          handleApproval={handleApproval}
        />

        {/* Review Guidelines */}
        <ReviewGuidelines />
      </div>
    </DashboardLayout>
  );
}

//#region Components

function NotificationToast({ notification, onClose }: { notification: Notification, onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
      notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {notification.type === 'success' ? <FaCheckCircle /> : <FaTimes />}
      <span>{notification.message}</span>
      <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">
        <FaTimes size={12} />
      </button>
    </div>
  );
}

function Header({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Hour Change Requests</h1>
          <p className="text-lg text-gray-600">Review and approve consultant hour change requests</p>
        </div>
        <div className="bg-blue-100 px-4 py-2 rounded-lg text-center">
          <div className="text-sm text-blue-600">Pending Requests</div>
          <div className="text-2xl font-bold text-blue-800">{pendingCount}</div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get icon based on change type
function getChangeTypeIcon(type: 'ADJUSTMENT' | 'SHIFT') {
  switch(type) {
    case 'ADJUSTMENT':
      return <FaClock />;
    case 'SHIFT':
      return <FaExchangeAlt />;
    default:
      return <FaClock />;
  }
}

// Helper function to get label based on change type
function getChangeTypeLabel(type: 'ADJUSTMENT' | 'SHIFT') {
  switch(type) {
    case 'ADJUSTMENT':
      return 'Hour Adjustment';
    case 'SHIFT':
      return 'Hour Transfer';
    default:
      return 'Hour Change';
  }
}

// Helper function to get a textual description of the change
function getChangeDescription(request: HourRequest) {
  if (request.changeType === 'ADJUSTMENT') {
    const change = request.requestedHours - request.originalHours;
    const action = change > 0 ? 'Increase' : 'Decrease';
    return `${action} by ${formatHours(Math.abs(change))}`;
  } else if (request.changeType === 'SHIFT') {
    return `Transfer ${formatHours(request.shiftHours || 0)} hours`;
  }
  return '';
}

function RequestList({
  requests,
  processingRequests,
  handleApproval
}: {
  requests: HourRequest[];
  processingRequests: Set<string>;
  handleApproval: (requestId: string, newStatus: 'APPROVED' | 'REJECTED') => void;
}) {
  if (requests.length === 0) return (
    <div className="bg-white rounded-lg shadow-md border p-12 text-center">
      <FaCheck className="mx-auto h-12 w-12 text-green-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
      <p className="text-gray-500">No pending hour change requests at this time.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md border divide-y">
      {requests.map(request => {
        const isProcessing = processingRequests.has(request.id);
        return (
          <div key={request.id} className="p-6 hover:bg-gray-50 flex items-start justify-between">
            {/* Left Info */}
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 bg-blue-100 rounded-full text-blue-600">{getChangeTypeIcon(request.changeType)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{getChangeTypeLabel(request.changeType)}</h3>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">PENDING</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Requested by:</strong> {request.requester.name || request.requester.email}</div>
                  <div><strong>Change:</strong> {getChangeDescription(request)}</div>
                  {request.changeType === 'ADJUSTMENT' && (
                    <div>
                      <strong>Hours:</strong> {formatHours(request.originalHours)} → {formatHours(request.requestedHours)}
                      <span className={`ml-2 font-medium ${request.requestedHours > request.originalHours ? 'text-green-600' : 'text-red-600'}`}>
                        ({request.requestedHours > request.originalHours ? '+' : ''}{formatHours(request.requestedHours - request.originalHours)})
                      </span>
                    </div>
                  )}
                  {request.weekNumber && request.year && <div><strong>Week:</strong> Week {request.weekNumber}, {request.year}</div>}
                  <div><strong>Submitted:</strong> {new Date(request.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <div className="font-medium text-gray-700 mb-1">Reason:</div>
                  {request.reason}
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={() => handleApproval(request.id, 'APPROVED')}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaCheck /> {isProcessing ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => handleApproval(request.id, 'REJECTED')}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaTimes /> {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewGuidelines() {
  return (
    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
      <h4 className="text-sm font-medium text-blue-800 mb-2">Review Guidelines</h4>
      <ul className="space-y-1">
        <li>• <strong>Hour Adjustments:</strong> Review if the requested change is reasonable for the project scope</li>
        <li>• <strong>Hour Transfers:</strong> Ensure both consultants are on the same project and the transfer makes sense</li>
        <li>• <strong>Reason:</strong> Consider the justification provided by the consultant</li>
        <li>• <strong>Impact:</strong> Approved changes will immediately update allocations and affect reporting</li>
      </ul>
    </div>
  );
}

//#endregion
