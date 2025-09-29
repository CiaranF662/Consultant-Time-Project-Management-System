'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { User, UserRole, UserStatus } from '@prisma/client';
import Link from 'next/link';
import { FaArrowLeft, FaUsers, FaUserCheck } from 'react-icons/fa';

import { useTheme } from '@/app/contexts/ThemeContext';
import { useNotification } from '@/app/contexts/NotificationContext';
import PageLoader from '@/app/components/ui/PageLoader';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'manage' | 'approvals'>('manage');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchPendingUsers = async () => {
    setIsLoadingPending(true);
    try {
      const { data } = await axios.get('/api/users?status=PENDING');
      setPendingUsers(data);
    } catch (err) {
      setError('Failed to load pending users.');
    } finally {
      setIsLoadingPending(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchUsers(), fetchPendingUsers()]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        try {
            await axios.patch(`/api/users/${userId}`, { role: newRole });
            fetchUsers();
            showSuccess('User role updated successfully!');
        } catch (err) {
            showError('Failed to update user role.');
        }
    }
  };

  const handleApproval = async (userId: string, newStatus: UserStatus) => {
    try {
      await axios.patch(`/api/admin/user-approvals/${userId}`, { status: newStatus });
      fetchPendingUsers();
      showSuccess('User approved successfully!');
    } catch (err) {
      showError('Failed to update user status.');
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading user data..." />;
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 min-h-screen">
        <div className="mb-6">
          <Link href="/dashboard" className={`flex items-center gap-2 text-sm font-medium hover:text-blue-600 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            <FaArrowLeft /> Back to Dashboard
          </Link>
        </div>
        
        <h1 className={`text-3xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>User Management</h1>
        
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'manage'
                    ? 'border-blue-500 text-blue-600'
                    : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                <FaUsers /> Manage Users
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'approvals'
                    ? 'border-blue-500 text-blue-600'
                    : `border-transparent ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                <FaUserCheck /> User Approvals
                {pendingUsers.length > 0 && (
                  <span className="ml-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    {pendingUsers.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'manage' ? (
          <div className={`rounded-lg shadow-md border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {isLoadingUsers ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <ul className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {users.map(user => (
                  <li key={user.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.name} ({user.email})</p>
                      <p className={`text-sm font-medium ${user.role === 'GROWTH_TEAM' ? 'text-blue-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.role.replace('_', ' ')}</p>
                    </div>
                    <div>
                      {user.role === 'CONSULTANT' && (
                        <button onClick={() => handleRoleChange(user.id, 'GROWTH_TEAM')} className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600">
                          Promote to Growth Team
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className={`rounded-lg shadow-md border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {isLoadingPending ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : pendingUsers.length > 0 ? (
              <ul className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {pendingUsers.map(user => (
                  <li key={user.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproval(user.id, 'APPROVED')} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">
                        Approve
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No pending user approvals.</p>
            )}
          </div>
        )}
    </div>
  );
}