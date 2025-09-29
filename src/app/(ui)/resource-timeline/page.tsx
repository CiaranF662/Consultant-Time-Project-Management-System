'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import ResourceTimeline from '@/app/components/timeline/ResourceTimeline';
import PageLoader from '@/app/components/ui/PageLoader';
import axios from 'axios';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

export default function ResourceTimelinePage() {
  const { theme } = useTheme();
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeks] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterUtilization, setFilterUtilization] = useState('all');
  
  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const { data } = await axios.get('/api/users?role=CONSULTANT');
        setConsultants(data);
      } catch (error) {
        console.error('Failed to fetch consultants:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConsultants();
  }, []);

  const filteredConsultants = useMemo(() => {
    return consultants.filter((consultant: any) => {
      const matchesSearch = consultant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           consultant.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || 
                         (filterRole === 'pm' && consultant.isProductManager) ||
                         (filterRole === 'consultant' && !consultant.isProductManager);
      
      return matchesSearch && matchesRole;
    });
  }, [consultants, searchTerm, filterRole]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterRole('all');
    setFilterUtilization('all');
  };
  
  if (loading) return <PageLoader message="Loading resource timeline..." />;
  
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 min-h-screen">
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Resource Timeline</h1>
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Visual overview of consultant allocations and availability</p>
      </div>

      {/* Search and Filter Controls */}
      <div className={`mb-6 p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative">
              <FaSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search consultants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <FaFilter className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className={`px-3 py-2 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="all">All Roles</option>
                <option value="pm">Product Managers</option>
                <option value="consultant">Consultants</option>
              </select>
            </div>
          </div>

          {/* Results and Clear */}
          <div className="flex items-center gap-4">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredConsultants.length} of {consultants.length} consultants
            </span>
            {(searchTerm || filterRole !== 'all') && (
              <button
                onClick={clearFilters}
                className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <FaTimes className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <ResourceTimeline consultants={filteredConsultants} weeks={weeks} />
    </div>
  );
}