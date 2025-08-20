'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import type { User, UserRole } from '@prisma/client';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        try {
            await axios.patch(`/api/users/${userId}`, { role: newRole });
            fetchUsers(); // Refresh the list
        } catch (err) {
            alert('Failed to update user role.');
        }
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
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Users</h1>
        <div className="bg-white rounded-lg shadow-md border">
          <ul className="divide-y divide-gray-200">
            {users.map(user => (
              <li key={user.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{user.name} ({user.email})</p>
                  <p className={`text-sm font-medium ${user.role === 'GROWTH_TEAM' ? 'text-blue-600' : 'text-gray-500'}`}>{user.role.replace('_', ' ')}</p>
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
        </div>
      </div>
    </div>
  );
}