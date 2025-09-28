'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import WeeklyPlannerEnhanced from './WeeklyPlannerEnhanced';

interface WeeklyPlannerWrapperProps {
  consultantId: string;
  initialPhaseAllocations: Array<any>;
  initialWeeklyAllocations: Array<any>; // Keep for backward compatibility but unused
}

export default function WeeklyPlannerWrapper({ 
  consultantId, 
  initialPhaseAllocations
}: WeeklyPlannerWrapperProps) {
  const [phaseAllocations, setPhaseAllocations] = useState(initialPhaseAllocations);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/consultants/${consultantId}/allocations`);
      setPhaseAllocations(response.data.phaseAllocations);
      // WeeklyPlannerEnhanced expects weeklyAllocations nested within phaseAllocations
    } catch (error) {
      console.error('Failed to refresh allocation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Refreshing your allocations...</p>
      </div>
    );
  }

  return (
    <WeeklyPlannerEnhanced 
      consultantId={consultantId}
      phaseAllocations={phaseAllocations}
      onDataChanged={refreshData}
    />
  );
}