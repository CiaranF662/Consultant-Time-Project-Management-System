'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import ResourceTimeline from '@/app/components/timeline/ResourceTimeline';
import PageLoader from '@/app/components/ui/PageLoader';
import axios from 'axios';

export default function ResourceTimelinePage() {
  const { theme } = useTheme();
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeks] = useState(12);
  
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
  
  if (loading) return <PageLoader message="Loading resource timeline..." />;
  
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 min-h-screen">
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Resource Timeline</h1>
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Visual overview of consultant allocations and availability</p>
      </div>
      <ResourceTimeline consultants={consultants} weeks={weeks} />
    </div>
  );
}