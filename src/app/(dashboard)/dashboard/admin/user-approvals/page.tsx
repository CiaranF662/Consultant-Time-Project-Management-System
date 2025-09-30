'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { User, UserStatus } from '@prisma/client';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function UserApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    setIsLoading(true);
    try {
      // --- THIS IS THE FIX: Added the query parameter to filter by status ---
      const { data } = await axios.get('/api/users?status=PENDING');
      setPendingUsers(data);
    } catch (err) {
      setError('Failed to load pending users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApproval = async (userId: string, newStatus: UserStatus) => {
    try {
      // Note: A 'REJECTED' status would require more logic (e.g., deleting the user)
      // For now, we are only handling the approval action.
      await axios.patch(`/api/admin/user-approvals/${userId}`, { status: newStatus });
      fetchPendingUsers(); // Refresh the list
    } catch (err) {
      alert(`Failed to update user status.`);
    }
  };

  if (isLoading) return <div className="text-center p-12">Loading...</div>;
  if (error) return <div className="text-center p-12 text-red-500">{error}</div>;

  return (
    
    <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600">
                    <FaArrowLeft /> Back to Dashboard
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">User Sign-Up Approvals</h1>
            <div className="bg-white rounded-lg shadow-md border">
                {pendingUsers.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {pendingUsers.map(user => (
                            <li key={user.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApproval(user.id, 'APPROVED')} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">
                                        Approve
                                    </button>
                                    {/* You can add a reject button with its own logic later */}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="p-8 text-center text-gray-500">No pending user approvals.</p>
                )}
            </div>
        </div>
    </div>
    
  );
}