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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-foreground border-gray-200';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                {changeInfo.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{changeInfo.title}</h2>
                <p className="text-sm text-gray-600">Request #{request.id.slice(-8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                {getStatusIcon(request.status)}
                {request.status}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-gray-600 rounded"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-foreground mb-3">Request Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{changeInfo.description}</span>
              </div>
              
              {request.changeType === 'ADJUSTMENT' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Hours:</span>
                    <span className="font-medium">{formatHours(request.originalHours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested Hours:</span>
                    <span className="font-medium">{formatHours(request.requestedHours)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Change:</span>
                    <span className={`font-medium ${
                      request.requestedHours > request.originalHours ? 'text-green-600' : 'text-red-600'
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
                    <span className="text-gray-600">Hours to Transfer:</span>
                    <span className="font-medium">{formatHours(request.shiftHours || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium">{request.requester.name || request.requester.email}</span>
                  </div>
                </>
              )}

              {request.weekNumber && request.year && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Specific Week:</span>
                  <span className="font-medium">Week {request.weekNumber}, {request.year}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">Reason for Request</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-card-foreground">{request.reason}</p>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Request Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <div className="font-medium text-foreground">Request Created</div>
                  <div className="text-sm text-gray-600">
                    {new Date(request.createdAt).toLocaleString()} by {request.requester.name || request.requester.email}
                  </div>
                </div>
              </div>

              {request.status !== 'PENDING' && (
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    request.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-foreground">
                      Request {request.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(request.updatedAt).toLocaleString()}
                      {request.approver && ` by ${request.approver.name || request.approver.email}`}
                    </div>
                  </div>
                </div>
              )}

              {request.status === 'PENDING' && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-foreground">Awaiting Approval</div>
                    <div className="text-sm text-gray-600">
                      Your request is being reviewed by the Growth Team
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {request.status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaReject className="text-red-600" />
                <h4 className="font-medium text-red-800">Request Rejected</h4>
              </div>
              <p className="text-sm text-red-700">
                This request was not approved. You may create a new request with additional justification if needed.
              </p>
            </div>
          )}

          {request.status === 'APPROVED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaCheck className="text-green-600" />
                <h4 className="font-medium text-green-800">Request Approved</h4>
              </div>
              <p className="text-sm text-green-700">
                Your hour change request has been approved and the changes have been applied to your allocations.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-card-foreground bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}