'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaClock, FaExchangeAlt, FaCheck, FaTimes, FaEye, FaCheckCircle } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import axios from 'axios';

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

export default function HourChangeApprovalsManager({ requests, userId }: HourChangeApprovalsManagerProps) {
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleApproval = async (requestId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      await axios.patch(`/api/admin/hour-changes/${requestId}`, { 
        status: newStatus 
      });
      
      setProcessedRequests(prev => new Set(prev).add(requestId));
      
      // Show success notification
      const action = newStatus === 'APPROVED' ? 'approved' : 'rejected';
      showNotification('success', `✓ Hour change request ${action} successfully!`);
      
      // Reload page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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

  const pendingRequests = requests.filter(req => !processedRequests.has(req.id));

  return (
    <div className="p-4 md:p-8 relative">
      {/* Notification Toast */}
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
            className="ml-2 text-white hover:text-gray-200"
          >
            <FaTimes size={12} />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 mb-4"
        >
          <FaArrowLeft /> Back to Dashboard
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Hour Change Requests</h1>
            <p className="text-lg text-gray-600">Review and approve consultant hour change requests</p>
          </div>
          <div className="bg-blue-100 px-4 py-2 rounded-lg">
            <div className="text-sm text-blue-600">Pending Requests</div>
            <div className="text-2xl font-bold text-blue-800">{pendingRequests.length}</div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg shadow-md border">
        {pendingRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FaCheck className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No pending hour change requests at this time.</p>
          </div>
        ) : (
          <div className="divide-y">
            {pendingRequests.map((request) => {
              const isProcessing = processingRequests.has(request.id);
              
              return (
                <div key={request.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        {getChangeTypeIcon(request.changeType)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getChangeTypeLabel(request.changeType)}
                          </h3>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            PENDING
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div>
                            <strong>Requested by:</strong> {request.requester.name || request.requester.email}
                          </div>
                          
                          <div>
                            <strong>Change:</strong> {getChangeDescription(request)}
                          </div>
                          
                          {request.changeType === 'ADJUSTMENT' && (
                            <div>
                              <strong>Hours:</strong> {formatHours(request.originalHours)} → {formatHours(request.requestedHours)}
                              <span className={`ml-2 font-medium ${
                                request.requestedHours > request.originalHours ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({request.requestedHours > request.originalHours ? '+' : ''}
                                {formatHours(request.requestedHours - request.originalHours)})
                              </span>
                            </div>
                          )}
                          
                          {request.weekNumber && request.year && (
                            <div>
                              <strong>Week:</strong> Week {request.weekNumber}, {request.year}
                            </div>
                          )}
                          
                          <div>
                            <strong>Submitted:</strong> {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-700 mb-1">Reason:</div>
                          <div className="text-sm text-gray-600">{request.reason}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleApproval(request.id, 'APPROVED')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaCheck />
                        {isProcessing ? 'Processing...' : 'Approve'}
                      </button>
                      
                      <button
                        onClick={() => handleApproval(request.id, 'REJECTED')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaTimes />
                        {isProcessing ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Review Guidelines</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Hour Adjustments:</strong> Review if the requested change is reasonable for the project scope</li>
          <li>• <strong>Hour Transfers:</strong> Ensure both consultants are on the same project and the transfer makes sense</li>
          <li>• <strong>Reason:</strong> Consider the justification provided by the consultant</li>
          <li>• <strong>Impact:</strong> Approved changes will immediately update allocations and affect reporting</li>
        </ul>
      </div>
    </div>
  );
}