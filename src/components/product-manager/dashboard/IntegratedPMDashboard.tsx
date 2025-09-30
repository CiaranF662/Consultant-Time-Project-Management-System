'use client';

import { useState, useEffect } from 'react';
import { FaUserTie, FaUser } from 'react-icons/fa';
import ProductManagerDashboard from './ProductManagerDashboard';
import ConsultantDashboard from '@/components/consultant/dashboard/ConsultantDashboard';
import { ComponentLoading } from '@/components/ui/LoadingSpinner';

interface IntegratedPMDashboardProps {
  userId: string;
  userName: string;
}

export default function IntegratedPMDashboard({ userId, userName }: IntegratedPMDashboardProps) {
  const [activeRole, setActiveRole] = useState<'pm' | 'consultant'>('pm');
  const [consultantData, setConsultantData] = useState<any>(null);
  const [loadingConsultantData, setLoadingConsultantData] = useState(false);

  // Fetch consultant data when switching to consultant mode
  useEffect(() => {
    if (activeRole === 'consultant' && !consultantData) {
      fetchConsultantData();
    }
  }, [activeRole]);

  const fetchConsultantData = async () => {
    setLoadingConsultantData(true);
    try {
      // Get all phase allocations for the consultant with related data (same as allocations page)
      const response = await fetch('/api/user/consultant-data');
      if (response.ok) {
        const data = await response.json();
        setConsultantData(data);
      }
    } catch (error) {
      console.error('Error fetching consultant data:', error);
    } finally {
      setLoadingConsultantData(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top-level Role Switcher - Inline with Sidebar Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Role Toggle Buttons - Compact and Inline */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveRole('pm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeRole === 'pm'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <FaUserTie className="w-3.5 h-3.5" />
              Product Manager Mode
            </button>
            <button
              onClick={() => setActiveRole('consultant')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeRole === 'consultant'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <FaUser className="w-3.5 h-3.5" />
              Consultant Mode
            </button>
          </div>

          {/* User Info - Compact */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {activeRole === 'pm' ? 'Managing projects and teams' : 'Personal allocations and planning'}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-800">{userName}</p>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div>
        {activeRole === 'pm' ? (
          <ProductManagerDashboard />
        ) : (
          <div>
            {loadingConsultantData ? (
              <ComponentLoading message="Loading consultant dashboard..." />
            ) : consultantData ? (
              <ConsultantDashboard
                data={consultantData}
                userId={userId}
                userName={userName}
              />
            ) : (
              <div className="p-8">
                <div className="text-center py-12">
                  <p className="text-gray-600">Failed to load consultant data. Please try again.</p>
                  <button
                    onClick={fetchConsultantData}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}