'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  getWeeksBetween, 
  formatWeekLabel, 
  formatHours,
  getWeekStart,
  getWeekEnd,
  getWeekNumber,
  getYear
} from '@/lib/dates';
import { FaSave, FaExclamationTriangle, FaPlus } from 'react-icons/fa';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  phase: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      title: string;
    };
    sprints: Array<{
      id: string;
      sprintNumber: number;
      startDate: Date;
      endDate: Date;
    }>;
  };
  weeklyAllocations: Array<{
    id: string;
    weekNumber: number;
    year: number;
    plannedHours: number;
    weekStartDate: Date;
    weekEndDate: Date;
  }>;
}

interface WeeklyPlannerEnhancedProps {
  consultantId: string;
  phaseAllocations: PhaseAllocation[];
}

interface WeekAllocation {
  phaseAllocationId: string;
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  year: number;
  hours: number;
  existingId?: string;
}

export default function WeeklyPlannerEnhanced({ consultantId, phaseAllocations }: WeeklyPlannerEnhancedProps) {
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [selectedPhase, setSelectedPhase] = useState<string>('all');

  useEffect(() => {
    // Initialize allocations from existing data
    const initialAllocations = new Map<string, number>();
    
    phaseAllocations.forEach((phaseAlloc) => {
      phaseAlloc.weeklyAllocations.forEach((allocation) => {
        const key = `${phaseAlloc.id}-${allocation.weekNumber}-${allocation.year}`;
        initialAllocations.set(key, allocation.plannedHours);
      });
    });
    
    setAllocations(initialAllocations);
  }, [phaseAllocations]);

  const handleHourChange = (phaseAllocationId: string, weekNumber: number, year: number, value: string) => {
    const key = `${phaseAllocationId}-${weekNumber}-${year}`;
    const hours = parseFloat(value) || 0;
    
    setAllocations(prev => new Map(prev.set(key, hours)));
    setUnsavedChanges(prev => new Set(prev).add(key));
    
    // Clear any existing error
    if (errors.has(key)) {
      setErrors(prev => {
        const newErrors = new Map(prev);
        newErrors.delete(key);
        return newErrors;
      });
    }
  };

  const saveAllocation = async (phaseAllocationId: string, weekNumber: number, year: number) => {
    const key = `${phaseAllocationId}-${weekNumber}-${year}`;
    const hours = allocations.get(key) || 0;
    
    setSaving(true);
    try {
      await axios.post('/api/allocations/weekly', {
        phaseAllocationId,
        weekNumber,
        year,
        plannedHours: hours
      });
      
      setUnsavedChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
      
      // Refresh page to get updated data
      window.location.reload();
    } catch (err: any) {
      setErrors(prev => new Map(prev.set(key, err.response?.data?.error || 'Failed to save')));
    } finally {
      setSaving(false);
    }
  };

  const getPhaseWeeks = (phase: PhaseAllocation['phase']) => {
    if (phase.sprints.length === 0) return [];
    
    const startDate = new Date(Math.min(...phase.sprints.map(s => new Date(s.startDate).getTime())));
    const endDate = new Date(Math.max(...phase.sprints.map(s => new Date(s.endDate).getTime())));
    
    return getWeeksBetween(startDate, endDate);
  };

  const filteredAllocations = selectedPhase === 'all' 
    ? phaseAllocations 
    : phaseAllocations.filter(alloc => alloc.id === selectedPhase);

  const getPhaseAllocationStatus = (phaseAlloc: PhaseAllocation) => {
    const allocated = phaseAlloc.weeklyAllocations.reduce((sum, w) => sum + w.plannedHours, 0);
    const remaining = phaseAlloc.totalHours - allocated;
    
    return {
      allocated,
      remaining,
      percentage: phaseAlloc.totalHours > 0 ? (allocated / phaseAlloc.totalHours) * 100 : 0
    };
  };

  return (
    <div className="p-4">
      {/* Phase Filter */}
      <div className="mb-6">
        <label htmlFor="phaseFilter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Phase
        </label>
        <select
          id="phaseFilter"
          value={selectedPhase}
          onChange={(e) => setSelectedPhase(e.target.value)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Phases</option>
          {phaseAllocations.map((phaseAlloc) => (
            <option key={phaseAlloc.id} value={phaseAlloc.id}>
              {phaseAlloc.phase.project.title} - {phaseAlloc.phase.name}
            </option>
          ))}
        </select>
      </div>

      {/* Allocations */}
      <div className="space-y-6">
        {filteredAllocations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No phase allocations found. Contact your Product Manager to assign you to project phases.
          </div>
        ) : (
          filteredAllocations.map((phaseAlloc) => {
            const weeks = getPhaseWeeks(phaseAlloc.phase);
            const status = getPhaseAllocationStatus(phaseAlloc);
            
            return (
              <div key={phaseAlloc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Phase Header */}
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {phaseAlloc.phase.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {phaseAlloc.phase.project.title} • {formatHours(phaseAlloc.totalHours)} total
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Allocated: {formatHours(status.allocated)}
                      </div>
                      <div className={`text-sm font-medium ${
                        status.remaining === 0 ? 'text-green-600' : 
                        status.remaining < 0 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {status.remaining === 0 ? 'Fully distributed' :
                         status.remaining < 0 ? `Over by ${formatHours(Math.abs(status.remaining))}` :
                         `${formatHours(status.remaining)} remaining`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          status.percentage > 100 ? 'bg-red-500' : 
                          status.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(status.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Weekly Allocation Grid */}
                <div className="p-4">
                  {weeks.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No sprints assigned to this phase yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {weeks.map((week) => {
                        const weekNumber = getWeekNumber(week);
                        const year = getYear(week);
                        const key = `${phaseAlloc.id}-${weekNumber}-${year}`;
                        const currentHours = allocations.get(key) || 0;
                        const hasUnsavedChanges = unsavedChanges.has(key);
                        const error = errors.get(key);
                        
                        return (
                          <div key={key} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <div className="text-sm font-medium text-gray-800">
                                {formatWeekLabel(week)}
                              </div>
                              {hasUnsavedChanges && (
                                <button
                                  onClick={() => saveAllocation(phaseAlloc.id, weekNumber, year)}
                                  disabled={saving}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Save changes"
                                >
                                  <FaSave />
                                </button>
                              )}
                            </div>
                            
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={currentHours}
                              onChange={(e) => handleHourChange(phaseAlloc.id, weekNumber, year, e.target.value)}
                              className={`block w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                                error ? 'border-red-300 focus:ring-red-500' : 
                                hasUnsavedChanges ? 'border-yellow-300 focus:ring-yellow-500' :
                                'border-gray-300 focus:ring-blue-500'
                              }`}
                              placeholder="0"
                            />
                            
                            {error && (
                              <p className="mt-1 text-xs text-red-600">{error}</p>
                            )}
                            
                            {hasUnsavedChanges && !error && (
                              <p className="mt-1 text-xs text-yellow-600">Unsaved changes</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">How to Use</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Enter the number of hours you plan to work each week for each phase</li>
          <li>• Click the save icon next to each week to save your changes</li>
          <li>• The progress bar shows how much of your total phase allocation you've distributed</li>
          <li>• Aim to distribute all your allocated hours across the phase duration</li>
        </ul>
      </div>
    </div>
  );
}