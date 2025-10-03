'use client';

import { FaCheck, FaTimes } from 'react-icons/fa';
import { formatHours, formatDate } from '@/lib/dates';

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

interface HourChangeApprovalProps {
  hourChangeRequests: HourChangeRequest[];
  onApproval: (requestId: string, action: 'approve' | 'reject', data?: any) => Promise<void>;
  processingIds: Set<string>;
}

export default function HourChangeApproval({
  hourChangeRequests,
  onApproval,
  processingIds
}: HourChangeApprovalProps) {
  return (
    <div className="space-y-6">
      {hourChangeRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
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
                      <h3 className="text-lg font-semibold text-foreground truncate">
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
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">
                        {request.changeType} Request
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>
                      <span className="font-medium">Consultant:</span> {request.requester.name || request.requester.email}
                    </span>
                    <span>
                      <span className="font-medium">Requested:</span> {formatDate(new Date(request.createdAt))}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-card-foreground">
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
                      onApproval(request.id, 'reject', { rejectionReason: reason });
                    }
                  }}
                  disabled={processingIds.has(request.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaTimes className="w-4 h-4" />
                  Reject
                </button>

                <button
                  onClick={() => onApproval(request.id, 'approve')}
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
  );
}