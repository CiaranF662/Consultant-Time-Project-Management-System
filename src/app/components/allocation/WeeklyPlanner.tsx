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
import { FaSave, FaExclamationTriangle } from 'react-icons/fa';

interface WeeklyPlannerProps {
  consultantId: string;
  phaseAllocations: Array<any>;
  weeklyAllocations: Array<any>;
  onDataChanged?: () => void; // Callback to refresh parent data
}

interface WeekAllocation {
  phaseAllocationId: string;
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  year: number;
  hours: number;
}

export default function WeeklyPlanner({ consultantId, phaseAllocations, weeklyAllocations, onDataChanged }: WeeklyPlannerProps) {
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Initialize allocations from existing data
    const initialAllocations = new Map<string, number>();
    weeklyAllocations.forEach((allocation) => {
      const key = `${allocation.phaseAllocationId}-${allocation.weekNumber}-${allocation.year}`;
      initialAllocations.set(key, allocation.plannedHours);
    });
    setAllocations(initialAllocations);
  }, [weeklyAllocations]);

  const handleHourChange = (phaseAllocationId: string, weekNumber: number, year: number, value: string) => {
    const key = `${phaseAllocationId}-${weekNumber}-${year}`;
    const hours = parseFloat(value) || 0;
    
    // Update allocation
    const newAllocations = new Map(allocations);
    newAllocations.set(key, hours);
    setAllocations(newAllocations);
    
    // Mark as unsaved
    const newUnsaved = new Set(unsavedChanges);
    newUnsaved.add(key);
    setUnsavedChanges(newUnsaved);
    
    // Validate
    validatePhaseAllocation(phaseAllocationId);
  };

  const validatePhaseAllocation = (phaseAllocationId: string) => {
    const phaseAllocation = phaseAllocations.find(pa => pa.id === phaseAllocationId);
    if (!phaseAllocation) return;

    let totalDistributed = 0;
    allocations.forEach((hours, key) => {
      if (key.startsWith(phaseAllocationId)) {
        totalDistributed += hours;
      }
    });

    const newErrors = new Map(errors);
    if (totalDistributed > phaseAllocation.totalHours) {
      newErrors.set(phaseAllocationId, `Over-allocated by ${formatHours(totalDistributed - phaseAllocation.totalHours)}`);
    } else {
      newErrors.delete(phaseAllocationId);
    }
    setErrors(newErrors);
  };

  const saveAllocations = async () => {
    if (unsavedChanges.size === 0) return;
    
    setSaving(true);
    try {
      const promises = Array.from(unsavedChanges).map(async (key) => {
        const [phaseAllocationId, weekNumber, year] = key.split('-');
        const hours = allocations.get(key) || 0;
        
        // Calculate week dates more safely
        const yearNum = parseInt(year);
        const weekNum = parseInt(weekNumber);
        
        // Validate year and week number
        if (isNaN(yearNum) || isNaN(weekNum) || yearNum < 2020 || yearNum > 2030 || weekNum < 1 || weekNum > 53) {
          console.error('Invalid year or week number:', { year, weekNumber });
          return Promise.reject(new Error(`Invalid date parameters: year=${year}, week=${weekNumber}`));
        }
        
        const weekStart = new Date(yearNum, 0, 1 + (weekNum - 1) * 7);
        const actualWeekStart = getWeekStart(weekStart);
        
        return axios.post('/api/allocations/weekly', {
          phaseAllocationId,
          weekStartDate: actualWeekStart.toISOString(),
          plannedHours: hours
        });
      });

      await Promise.all(promises);
      setUnsavedChanges(new Set());
      
      // Trigger parent data refresh
      if (onDataChanged) {
        onDataChanged();
      }
      
      // Show success message
      alert('Weekly allocations saved successfully! Your time distribution has been updated.');
    } catch (error) {
      console.error('Failed to save allocations:', error);
      alert('Failed to save allocations. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Group phases by project
  const projectGroups = phaseAllocations.reduce((groups: any, allocation: any) => {
    const projectId = allocation.phase.project.id;
    if (!groups[projectId]) {
      groups[projectId] = {
        project: allocation.phase.project,
        phases: []
      };
    }
    groups[projectId].phases.push(allocation);
    return groups;
  }, {});

  return (
    <div className="p-4">
      {Object.values(projectGroups).map((group: any) => (
        <div key={group.project.id} className="mb-8">
          <div className="flex items-center gap-3 mb-4 p-3 bg-white border-l-4 rounded-lg shadow-sm" style={{ borderLeftColor: `hsl(${Math.abs(group.project.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)` }}>
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: `hsl(${Math.abs(group.project.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)` }}
            />
            <h3 className="text-lg font-semibold text-gray-800">{group.project.title}</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {group.phases.length} phase{group.phases.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {group.phases.map((allocation: any) => {
            const phase = allocation.phase;
            
            // Validate dates before processing
            if (!phase.startDate || !phase.endDate) {
              console.error('Phase missing dates:', phase);
              return null;
            }
            
            const startDate = new Date(phase.startDate);
            const endDate = new Date(phase.endDate);
            
            // Check if dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.error('Invalid phase dates:', { startDate: phase.startDate, endDate: phase.endDate });
              return null;
            }
            
            const weeks = getWeeksBetween(startDate, endDate);
            
            // Calculate total distributed
            let totalDistributed = 0;
            weeks.forEach(week => {
              // Validate week data
              if (!week || typeof week.weekNumber === 'undefined' || typeof week.year === 'undefined') {
                console.error('Invalid week data:', week);
                return;
              }
              const key = `${allocation.id}-${week.weekNumber}-${week.year}`;
              totalDistributed += allocations.get(key) || 0;
            });
            
            const remaining = allocation.totalHours - totalDistributed;
            const hasError = errors.has(allocation.id);
            
            return (
              <div key={allocation.id} className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="font-medium text-gray-700">{phase.name}</h4>
                    <p className="text-sm text-gray-500">
                      Total: {formatHours(allocation.totalHours)} | 
                      Distributed: {formatHours(totalDistributed)} | 
                      <span className={remaining < 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {' '}Remaining: {formatHours(remaining)}
                      </span>
                    </p>
                  </div>
                  {hasError && (
                    <div className="flex items-center gap-2 text-red-600">
                      <FaExclamationTriangle />
                      <span className="text-sm">{errors.get(allocation.id)}</span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {weeks.map((week) => {
                    // Validate week data before using it
                    if (!week || typeof week.weekNumber === 'undefined' || typeof week.year === 'undefined') {
                      console.error('Invalid week data in input generation:', week);
                      return null;
                    }
                    
                    const key = `${allocation.id}-${week.weekNumber}-${week.year}`;
                    const value = allocations.get(key) || 0;
                    const isUnsaved = unsavedChanges.has(key);
                    
                    return (
                      <div key={key} className="bg-white rounded border p-2">
                        <label className="text-xs text-gray-600 block mb-1">
                          {week.label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={value || ''}
                          onChange={(e) => handleHourChange(
                            allocation.id,
                            week.weekNumber,
                            week.year,
                            e.target.value
                          )}
                          className={`w-full px-2 py-1 text-sm border rounded ${
                            isUnsaved ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                      </div>
                    );
                  }).filter(Boolean)} {/* Filter out null results from invalid week data */}
                </div>
              </div>
            );
          }).filter(Boolean)} {/* Filter out null results from invalid dates */}
        </div>
      ))}
      
      {/* Save Button */}
      {unsavedChanges.size > 0 && (
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between items-center">
          <p className="text-sm text-yellow-600">
            You have {unsavedChanges.size} unsaved change{unsavedChanges.size !== 1 ? 's' : ''}
          </p>
          <button
            onClick={saveAllocations}
            disabled={saving || errors.size > 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <FaSave />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
      
      {phaseAllocations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No phase allocations found. You'll see allocations here once a Product Manager assigns hours to you.
        </div>
      )}
    </div>
  );
}