'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import type { User, UserRole, UserStatus } from '@prisma/client';
import { FaCheck, FaTimes } from 'react-icons/fa';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';

enum Tab {
  APPROVALS = 'approvals',
  MANAGE = 'manage',
}

// --- Confirmation Modal Component ---
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

function ConfirmationModal({ isOpen, onClose, onConfirm, message }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-80">
        <p className="mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-300 rounded-md hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// --- Main Component ---
// ---------------------------
export default function UsersDashboardPage() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<Tab>(Tab.APPROVALS);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState<() => void>(() => {});

  // --- Fetch Data ---
  const fetchPendingUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/users?status=PENDING');
      setPendingUsers(data);
    } catch {
      setError('Failed to load pending users.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/users');
      setAllUsers(data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    fetchAllUsers();
  }, []);

  // --- Actions ---
  const handleApproval = async (userId: string, newStatus: UserStatus) => {
    try {
      await axios.patch(`/api/admin/user-approvals/${userId}`, { status: newStatus });
      fetchPendingUsers();
    } catch {
      alert(`Failed to update user status.`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await axios.patch(`/api/users/${userId}`, { role: newRole });
      fetchAllUsers();
    } catch {
      alert('Failed to update user role.');
    }
  };

  const confirmAction = (message: string, action: () => void) => {
    setModalMessage(message);
    setModalAction(() => action);
    setModalOpen(true);
  };

  // --- Filtered Users ---
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter ? user.role === roleFilter : true;
      return matchesSearch && matchesRole;
    });
  }, [allUsers, searchQuery, roleFilter]);

  // --- Loading/Error States ---
  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </DashboardLayout>
  );
  if (error) return (
    <DashboardLayout>
      <div className="text-center p-12 text-red-500">{error}</div>
    </DashboardLayout>
  );

  // #region Render 
  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen p-4 md:p-8 space-y-6">

        {/* Header / Tabs */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab(Tab.APPROVALS)}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === Tab.APPROVALS ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            >
              Approvals
            </button>
            <button
              onClick={() => setActiveTab(Tab.MANAGE)}
              className={`px-4 py-2 rounded-md font-medium ${activeTab === Tab.MANAGE ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            >
              Manage Users
            </button>
          </div>
        </div>

        {/*  Pending User Approvals */}
        {activeTab === Tab.APPROVALS && (
          <div className="bg-white rounded-lg shadow-md border p-4">
            {pendingUsers.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {pendingUsers.map(user => (
                  <li key={user.id} className="p-4 flex justify-between items-center hover:bg-gray-50 rounded-md">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmAction(`Approve ${user.name}?`, () => handleApproval(user.id, 'APPROVED'))}
                        className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 flex items-center gap-1"
                      >
                        <FaCheck /> Approve
                      </button>
                      <button
                        onClick={() => confirmAction(`Reject ${user.name}?`, () => handleApproval(user.id, 'PENDING'))} 
                        className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 flex items-center gap-1"
                      >
                        <FaTimes /> Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-8 text-center text-gray-500">No pending user approvals.</p>
            )}
          </div>
        )}

        {/* Manage Users Section */}
        {activeTab === Tab.MANAGE && (
          <div className="bg-white rounded-lg shadow-md border p-4 space-y-4">
            {/* Search & Role Filter */}
            <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by name or email..."
                className="border rounded-md px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="CONSULTANT">Consultant</option>
                <option value="GROWTH_TEAM">Growth Team</option>
              </select>
            </div>

            {/* Users List */}
            {filteredUsers.length > 0 ? (
              <ul className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {filteredUsers.map(user => (
                  <li key={user.id} className="p-4 flex justify-between items-center hover:bg-gray-50 rounded-md">
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        user.role === 'GROWTH_TEAM' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Role Actions */}
                    <div className="flex gap-2">
                      {user.role === 'CONSULTANT' && (
                        <button
                          onClick={() => confirmAction(`Promote ${user.name} to Growth Team?`, () => handleRoleChange(user.id, 'GROWTH_TEAM'))}
                          className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition"
                        >
                          Promote
                        </button>
                      )}
                      {user.role === 'GROWTH_TEAM' && (
                        <button
                          onClick={() => confirmAction(`Demote ${user.name} to Consultant?`, () => handleRoleChange(user.id, 'CONSULTANT'))}
                          className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition"
                        >
                          Demote
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-8 text-center text-gray-500">No users found.</p>
            )}
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalAction}
        message={modalMessage}
      />
    </DashboardLayout>
  );
}
// #endregion Render