'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import GrowthTeamReports from '@/app/components/reports/GrowthTeamReport';

export default function ReportsPage() {
  const { theme } = useTheme();
  
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 min-h-screen">
      <div className="mb-6">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Reports</h1>
        <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Strategic insights for revenue optimization and resource planning</p>
      </div>
      <GrowthTeamReports />
    </div>
  );
}