'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  getWeeksBetween, 
  formatHours
} from '@/lib/dates';
import { FaSave, FaChevronDown, FaChevronRight, FaCheckCircle, FaTimes } from 'react-icons/fa';

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
  onDataChanged?: () => void; // Callback to refresh parent data
}

export default function WeeklyPlannerEnhanced({ phaseAllocations, onDataChanged }: WeeklyPlannerEnhancedProps) {
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

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

  const savePhaseAllocations = async (phaseAllocationId: string) => {
    const phaseKeys = Array.from(unsavedChanges).filter(key => key.startsWith(`${phaseAllocationId}-`));
    if (phaseKeys.length === 0) return;

    setSaving(true);
    try {
      const savePromises = phaseKeys.map(async (key) => {
        const [, weekNumber, year] = key.split('-');
        const hours = allocations.get(key) || 0;
        
        // Find the corresponding week data to get weekStartDate
        const phaseAlloc = phaseAllocations.find(pa => pa.id === phaseAllocationId);
        if (!phaseAlloc) {
          throw new Error('Phase allocation not found');
        }
        
        const weeks = getPhaseWeeks(phaseAlloc.phase);
        const week = weeks.find(w => w.weekNumber === parseInt(weekNumber) && w.year === parseInt(year));
        
        if (!week) {
          throw new Error('Week not found');
        }
        
        return axios.post('/api/allocations/weekly', {
          phaseAllocationId,
          weekStartDate: week.weekStart.toISOString(),
          plannedHours: hours
        });
      });

      await Promise.all(savePromises);
      
      // Remove saved keys from unsaved changes
      setUnsavedChanges(prev => {
        const newSet = new Set(prev);
        phaseKeys.forEach(key => newSet.delete(key));
        return newSet;
      });
      
      // Clear any errors for this phase
      setErrors(prev => {
        const newErrors = new Map(prev);
        phaseKeys.forEach(key => newErrors.delete(key));
        return newErrors;
      });
      
      // Trigger parent data refresh if callback provided
      if (onDataChanged) {
        onDataChanged();
      }
      
      // Show success notification
      const phaseName = phaseAllocations.find(pa => pa.id === phaseAllocationId)?.phase.name || 'Phase';
      showNotification('success', `✓ ${phaseName} allocations saved successfully!`);
      
    } catch (err: any) {
      console.error('Failed to save phase allocations:', err);
      // Mark first failed key with error
      if (phaseKeys.length > 0) {
        setErrors(prev => new Map(prev.set(phaseKeys[0], 'Failed to save phase allocations')));
      }
      
      // Show error notification
      const phaseName = phaseAllocations.find(pa => pa.id === phaseAllocationId)?.phase.name || 'Phase';
      showNotification('error', `✗ Failed to save ${phaseName} allocations. Please try again.`);
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

  // Group allocations by project
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

  // Filter by selected project
  const filteredProjectGroups = selectedProject === 'all' 
    ? projectGroups 
    : { [selectedProject]: projectGroups[selectedProject] };

  // Get unique projects for filter dropdown
  const uniqueProjectIds = Array.from(new Set(phaseAllocations.map(alloc => alloc.phase.project.id)));
  const uniqueProjects = uniqueProjectIds.map(id => {
    const allocation = phaseAllocations.find(alloc => alloc.phase.project.id === id);
    return {
      id,
      title: allocation!.phase.project.title
    };
  });

  const getPhaseAllocationStatus = (phaseAlloc: PhaseAllocation) => {
    // Calculate distributed hours from current user input (including unsaved changes)
    let distributed = 0;
    
    allocations.forEach((hours, key) => {
      // Check if this allocation key belongs to the current phase
      if (key.startsWith(`${phaseAlloc.id}-`)) {
        distributed += hours;
      }
    });
    
    // Total allocated hours is fixed (from phase allocation)
    const totalAllocated = phaseAlloc.totalHours;
    const remaining = totalAllocated - distributed;
    
    return {
      allocated: totalAllocated,        // Fixed total allocated to consultant
      distributed,                      // What user has distributed across weeks
      remaining,                        // How much left to distribute
      percentage: totalAllocated > 0 ? (distributed / totalAllocated) * 100 : 0
    };
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  return (
    <div className="p-4 relative">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <FaCheckCircle /> : <FaTimes />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            className="ml-2 hover:opacity-70"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* Project Filter */}
      <div className="mb-6">
        <label htmlFor="projectFilter" className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Project
        </label>
        <select
          id="projectFilter"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Projects</option>
          {uniqueProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </div>

      {/* Allocations by Project */}
      <div className="space-y-8">
        {Object.keys(filteredProjectGroups).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No phase allocations found. Contact your Product Manager to assign you to project phases.
          </div>
        ) : (
          Object.values(filteredProjectGroups).map((group: any) => (
            <div key={group.project.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Project Header */}
              <div 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                onClick={() => toggleProjectCollapse(group.project.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {collapsedProjects.has(group.project.id) ? (
                      <FaChevronRight className="text-gray-500" />
                    ) : (
                      <FaChevronDown className="text-gray-500" />
                    )}
                  </div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: `hsl(${Math.abs(group.project.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)` }}
                  />
                  <h3 className="text-xl font-semibold text-gray-800">{group.project.title}</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {group.phases.length} phase{group.phases.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {group.project.description && (
                  <p className="mt-2 text-sm text-gray-600">{group.project.description}</p>
                )}
              </div>

              {/* Phases within Project */}
              {!collapsedProjects.has(group.project.id) && (
                <div className="p-6 space-y-6">
                  {group.phases.map((phaseAlloc: any) => {
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
                            <div className="text-sm text-gray-600">
                              Distributed: {formatHours(status.distributed)}
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
                              const weekNumber = week.weekNumber;
                              const year = week.year;
                              const key = `${phaseAlloc.id}-${weekNumber}-${year}`;
                              const currentHours = allocations.get(key) || 0;
                              const hasUnsavedChanges = unsavedChanges.has(key);
                              const error = errors.get(key);
                              
                              return (
                                <div key={key} className="border border-gray-200 rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-medium text-gray-800">
                                      {week.label}
                                    </div>
                                  </div>
                                  
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={currentHours || ''}
                                    onChange={(e) => handleHourChange(phaseAlloc.id, weekNumber, year, e.target.value)}
                                    className={`block w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                                      error ? 'border-red-300 focus:ring-red-500' : 
                                      hasUnsavedChanges ? 'border-yellow-300 focus:ring-yellow-500' :
                                      'border-gray-300 focus:ring-blue-500'
                                    }`}
                                    placeholder="Enter hours"
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
                        
                        {/* Phase Save Button */}
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => savePhaseAllocations(phaseAlloc.id)}
                            disabled={saving || !Array.from(unsavedChanges).some(key => key.startsWith(`${phaseAlloc.id}-`))}
                            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
                              Array.from(unsavedChanges).some(key => key.startsWith(`${phaseAlloc.id}-`)) && !saving
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <FaSave />
                            {saving ? 'Saving...' : 'Save Phase Allocations'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">How to Use</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Click on project headers to collapse/expand phases for better organization</li>
          <li>• Enter the number of hours you plan to work each week for each phase</li>
          <li>• Click the "Save Phase Allocations" button to save all changes for that phase</li>
          <li>• The progress bar shows how much of your total phase allocation you've distributed</li>
          <li>• Aim to distribute all your allocated hours across the phase duration</li>
        </ul>
      </div>
    </div>
  );
}