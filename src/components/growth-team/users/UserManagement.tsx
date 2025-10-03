'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { User, UserRole, UserStatus } from '@prisma/client';
import {
  FaUsers, FaUserCheck, FaUserTie, FaUserClock,
  FaSearch, FaFilter, FaCheck, FaTimes, FaEdit,
  FaTrash, FaUserShield, FaBan
} from 'react-icons/fa';

interface UserManagementProps {
  initialData?: {
    users: User[];
    pendingUsers: User[];
  };
}

export default function UserManagement({ initialData }: UserManagementProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [users, setUsers] = useState<User[]>(initialData?.users || []);
  const [pendingUsers, setPendingUsers] = useState<User[]>(initialData?.pendingUsers || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [loading, setLoading] = useState(!initialData);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allUsersRes, pendingUsersRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/users?status=PENDING')
      ]);
      setUsers(allUsersRes.data);
      setPendingUsers(pendingUsersRes.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      await axios.patch(`/api/admin/user-approvals/${userId}`, { status: 'APPROVED' });
      await fetchData();
    } catch (error) {
      alert('Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      await axios.delete(`/api/users/${selectedUser.id}`);
      await fetchData();
      setShowRejectModal(false);
      setSelectedUser(null);
    } catch (error) {
      alert('Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) return;
    setActionLoading(selectedUser.id);
    try {
      await axios.patch(`/api/users/${selectedUser.id}`, { role: selectedRole });
      await fetchData();
      setShowRoleModal(false);
      setSelectedUser(null);
      setSelectedRole(null);
    } catch (error) {
      alert('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      await axios.delete(`/api/users/${selectedUser.id}`);
      await fetchData();
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      alert('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredPendingUsers = pendingUsers.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    totalUsers: users.length,
    pendingApprovals: pendingUsers.length,
    growthTeamMembers: users.filter(u => u.role === 'GROWTH_TEAM').length,
    consultants: users.filter(u => u.role === 'CONSULTANT').length
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">User Management</h1>
        <p className="text-lg text-gray-600">Manage user approvals and permissions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-lg">
              <FaUsers className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Total Users</p>
            </div>
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            All approved users in the system
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500 dark:bg-orange-600 rounded-lg">
              <FaUserClock className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pendingApprovals}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400">Pending Approvals</p>
            </div>
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-300">
            {stats.pendingApprovals > 0 ? 'Awaiting your review' : 'All caught up!'}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500 dark:bg-purple-600 rounded-lg">
              <FaUserShield className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.growthTeamMembers}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Growth Team</p>
            </div>
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300">
            Administrative users
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500 dark:bg-green-600 rounded-lg">
              <FaUserTie className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.consultants}</p>
              <p className="text-sm text-green-600 dark:text-green-400">Consultants</p>
            </div>
          </div>
          <div className="text-xs text-green-700 dark:text-green-300">
            Active consultants
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaUserClock />
                Pending Approvals
                {stats.pendingApprovals > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
                    {stats.pendingApprovals}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaUsers />
                All Users
                <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                  {stats.totalUsers}
                </span>
              </div>
            </button>
          </nav>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Role Filter (only on All Users tab) */}
            {activeTab === 'all' && (
              <div className="sm:w-64">
                <div className="relative">
                  <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="GROWTH_TEAM">Growth Team</option>
                    <option value="CONSULTANT">Consultant</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading users...</p>
            </div>
          ) : activeTab === 'pending' ? (
            // Pending Approvals Tab
            filteredPendingUsers.length > 0 ? (
              <div className="space-y-3">
                {filteredPendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
                        <FaUserClock className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-orange-600 mt-1">
                          Registered: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRejectModal(true);
                        }}
                        disabled={actionLoading === user.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                      >
                        <FaTimes className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading === user.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                      >
                        {actionLoading === user.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Approving...
                          </>
                        ) : (
                          <>
                            <FaCheck className="w-3.5 h-3.5" />
                            Approve
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FaUserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-gray-600">
                  {searchQuery ? 'No pending users match your search' : 'No pending user approvals'}
                </p>
              </div>
            )
          ) : (
            // All Users Tab
            filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-blue-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">
                                {user.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{user.name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'GROWTH_TEAM'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {user.role === 'GROWTH_TEAM' ? (
                              <FaUserShield className="w-3 h-3" />
                            ) : (
                              <FaUserTie className="w-3 h-3" />
                            )}
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedRole(user.role === 'CONSULTANT' ? 'GROWTH_TEAM' : 'CONSULTANT');
                                setShowRoleModal(true);
                              }}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Change Role"
                            >
                              <FaEdit className="w-3.5 h-3.5" />
                              Role
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <FaTrash className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FaUsers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-gray-600">
                  {searchQuery || roleFilter !== 'ALL'
                    ? 'No users match your filters'
                    : 'No users found'}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-red-600 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold">Reject User Registration</h3>
            </div>
            <div className="p-6">
              <p className="text-card-foreground mb-4">
                Are you sure you want to reject the registration for <strong>{selectedUser.name}</strong>?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete their account and they will need to register again.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-card-foreground hover:bg-gray-50"
                  disabled={actionLoading === selectedUser.id}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400"
                  disabled={actionLoading === selectedUser.id}
                >
                  {actionLoading === selectedUser.id ? 'Rejecting...' : 'Reject User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-blue-600 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold">Change User Role</h3>
            </div>
            <div className="p-6">
              <p className="text-card-foreground mb-4">
                Change role for <strong>{selectedUser.name}</strong> to:
              </p>
              <div className="mb-4">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CONSULTANT">Consultant</option>
                  <option value="GROWTH_TEAM">Growth Team</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setSelectedRole(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-card-foreground hover:bg-gray-50"
                  disabled={actionLoading === selectedUser.id}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleChange}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={actionLoading === selectedUser.id}
                >
                  {actionLoading === selectedUser.id ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-red-600 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold">Delete User</h3>
            </div>
            <div className="p-6">
              <p className="text-card-foreground mb-4">
                Are you sure you want to delete <strong>{selectedUser.name}</strong>?
              </p>
              <p className="text-sm text-red-600 font-medium mb-4">
                ⚠️ This action cannot be undone. All user data will be permanently deleted.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-card-foreground hover:bg-gray-50"
                  disabled={actionLoading === selectedUser.id}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400"
                  disabled={actionLoading === selectedUser.id}
                >
                  {actionLoading === selectedUser.id ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
