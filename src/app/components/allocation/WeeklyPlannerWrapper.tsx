'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import WeeklyPlanner from './WeeklyPlanner';

interface WeeklyPlannerWrapperProps {
  consultantId: string;
  initialPhaseAllocations: Array<any>;
  initialWeeklyAllocations: Array<any>;
}

export default function WeeklyPlannerWrapper({ 
  consultantId, 
  initialPhaseAllocations, 
  initialWeeklyAllocations 
}: WeeklyPlannerWrapperProps) {
  const [phaseAllocations, setPhaseAllocations] = useState(initialPhaseAllocations);
  const [weeklyAllocations, setWeeklyAllocations] = useState(initialWeeklyAllocations);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/consultants/${consultantId}/allocations`);
      setPhaseAllocations(response.data.phaseAllocations);
      setWeeklyAllocations(response.data.weeklyAllocations);
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
    <WeeklyPlanner 
      consultantId={consultantId}
      phaseAllocations={phaseAllocations}
      weeklyAllocations={weeklyAllocations}
      onDataChanged={refreshData}
    />
  );
}