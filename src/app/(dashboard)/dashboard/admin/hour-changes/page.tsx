'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { HourChangeRequest, User, Project, Sprint } from '@prisma/client';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import DashboardLayout from '@/app/components/DashboardLayout';

type ExtendedHourChangeRequest = HourChangeRequest & {
    requester: User;
    sprint: Sprint & {
        project: Project;
    };
}

export default function HourChangeApprovalsPage() {
  const [requests, setRequests] = useState<ExtendedHourChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/admin/hour-changes');
      setRequests(data);
    } catch (err) {
      setError('Failed to load hour change requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproval = async (requestId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await axios.patch(`/api/admin/hour-changes/${requestId}`, { status: newStatus });
      fetchRequests(); // Refresh list
    } catch (err) {
      alert('Failed to update request.');
    }
  };

  if (isLoading) return <div className="text-center p-12">Loading...</div>;
  if (error) return <div className="text-center p-12 text-red-500">{error}</div>;

  return (
    <DashboardLayout>
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-4 md:p-8">
        <div className="mb-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600">
                <FaArrowLeft /> Back to Dashboard
            </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Hour Change Requests</h1>
        <div className="space-y-4">
            {requests.length > 0 ? (
                requests.map(req => (
                    <div key={req.id} className="bg-white p-4 rounded-lg shadow-md border">
                        <div className="flex justify-between items-start">
                            <div>
                                {/* --- THIS IS THE FIX --- */}
                                <p className="font-semibold text-gray-800">{req.requester.name} - {req.sprint.project.title}</p>
                                <p className="text-sm text-gray-500">Sprint {req.sprint.sprintNumber} - Week {req.weekNumber}</p>
                                <p className="text-sm mt-1">
                                    Request: <strong>{req.originalHours}h → {req.requestedHours}h</strong>
                                </p>
                                <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-md">Reason: "{req.reason}"</p>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                                <div className="flex gap-2">
                                    <button onClick={() => handleApproval(req.id, 'APPROVED')} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">
                                        Approve
                                    </button>
                                    <button onClick={() => handleApproval(req.id, 'REJECTED')} className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600">
                                        Reject
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 px-6 bg-white rounded-lg shadow-md border">
                    <p className="text-gray-500">No pending hour change requests.</p>
                </div>
            )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}