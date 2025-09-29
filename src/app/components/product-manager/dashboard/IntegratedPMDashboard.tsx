'use client';

import { useState, useEffect } from 'react';
import { FaUserTie, FaUser } from 'react-icons/fa';
import ProductManagerDashboard from './ProductManagerDashboard';
import ConsultantDashboard from '@/app/components/consultant/dashboard/ConsultantDashboard';

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
      {/* Top-level Role Switcher */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveRole('pm')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeRole === 'pm'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <FaUserTie className="w-4 h-4" />
                Product Manager Mode
              </button>
              <button
                onClick={() => setActiveRole('consultant')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeRole === 'consultant'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <FaUser className="w-4 h-4" />
                Consultant Mode
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {activeRole === 'pm' ? 'Managing projects and teams' : 'Personal allocations and planning'}
              </p>
              <p className="text-lg font-semibold text-gray-800">{userName}</p>
            </div>
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
              <div className="p-8">
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                  <span className="ml-4 text-gray-600">Loading consultant data...</span>
                </div>
              </div>
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