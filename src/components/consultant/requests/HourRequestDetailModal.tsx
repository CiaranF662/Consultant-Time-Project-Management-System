'use client';

import { FaTimes, FaClock, FaExchangeAlt, FaCheck, FaTimes as FaReject, FaUser } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

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

interface HourRequestDetailModalProps {
  request: HourRequest;
  onClose: () => void;
}

export default function HourRequestDetailModal({ request, onClose }: HourRequestDetailModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case 'APPROVED':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-foreground border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <FaClock />;
      case 'APPROVED':
        return <FaCheck />;
      case 'REJECTED':
        return <FaReject />;
      default:
        return <FaClock />;
    }
  };

  const getChangeDescription = () => {
    if (request.changeType === 'ADJUSTMENT') {
      const change = request.requestedHours - request.originalHours;
      const action = change > 0 ? 'Increase' : 'Decrease';
      return {
        title: 'Hour Adjustment Request',
        description: `${action} allocation by ${formatHours(Math.abs(change))}`,
        icon: <FaClock className="h-6 w-6" />
      };
    } else {
      return {
        title: 'Hour Transfer Request',
        description: `Transfer ${formatHours(request.shiftHours || 0)} hours to another team member`,
        icon: <FaExchangeAlt className="h-6 w-6" />
      };
    }
  };

  const changeInfo = getChangeDescription();

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-600 dark:text-blue-300">
                {changeInfo.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{changeInfo.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Request #{request.id.slice(-8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
                {request.status}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-gray-600 dark:hover:text-gray-400 rounded"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-foreground mb-3">Request Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="font-medium text-foreground">{changeInfo.description}</span>
              </div>
              
              {request.changeType === 'ADJUSTMENT' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Hours:</span>
                    <span className="font-medium text-foreground">{formatHours(request.originalHours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Requested Hours:</span>
                    <span className="font-medium text-foreground">{formatHours(request.requestedHours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Change:</span>
                    <span className={`font-medium ${
                      request.requestedHours > request.originalHours ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {request.requestedHours > request.originalHours ? '+' : ''}
                      {formatHours(request.requestedHours - request.originalHours)}
                    </span>
                  </div>
                </>
              )}

              {request.changeType === 'SHIFT' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Hours to Transfer:</span>
                    <span className="font-medium text-foreground">{formatHours(request.shiftHours || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">From:</span>
                    <span className="font-medium text-foreground">{request.requester.name || request.requester.email}</span>
                  </div>
                </>
              )}

              {request.weekNumber && request.year && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Specific Week:</span>
                  <span className="font-medium text-foreground">Week {request.weekNumber}, {request.year}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">Reason for Request</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-card-foreground">{request.reason}</p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Request Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-foreground">Request Created</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(request.createdAt).toLocaleString()} by {request.requester.name || request.requester.email}
                  </div>
                </div>
              </div>

              {request.status !== 'PENDING' && (
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    request.status === 'APPROVED' ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'
                  }`}></div>
                  <div>
                    <div className="font-medium text-foreground">
                      Request {request.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(request.updatedAt).toLocaleString()}
                      {request.approver && ` by ${request.approver.name || request.approver.email}`}
                    </div>
                  </div>
                </div>
              )}

              {request.status === 'PENDING' && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-foreground">Awaiting Approval</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Your request is being reviewed by the Growth Team
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {request.status === 'REJECTED' && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaReject className="text-red-600 dark:text-red-400" />
                <h4 className="font-medium text-red-800 dark:text-red-200">Request Rejected</h4>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                This request was not approved. You may create a new request with additional justification if needed.
              </p>
            </div>
          )}

          {request.status === 'APPROVED' && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaCheck className="text-green-600 dark:text-green-400" />
                <h4 className="font-medium text-green-800 dark:text-green-200">Request Approved</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your hour change request has been approved and the changes have been applied to your allocations.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-card-foreground bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}