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
  consultantDescription?: string; // Added for phase description
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
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [phaseDescriptions, setPhaseDescriptions] = useState<Map<string, string>>(new Map());
  const [unsavedDescriptions, setUnsavedDescriptions] = useState<Map<string, string>>(new Map());
  const [showDescriptionModal, setShowDescriptionModal] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  useEffect(() => {
    // Initialize allocations from existing data
    const initialAllocations = new Map<string, number>();
    const initialDescriptions = new Map<string, string>();
    
    phaseAllocations.forEach((phaseAlloc) => {
      phaseAlloc.weeklyAllocations.forEach((allocation) => {
        const key = `${phaseAlloc.id}-${allocation.weekNumber}-${allocation.year}`;
        initialAllocations.set(key, allocation.plannedHours);
      });
      
      // Initialize phase descriptions
      if (phaseAlloc.consultantDescription) {
        initialDescriptions.set(phaseAlloc.id, phaseAlloc.consultantDescription);
      }
    });
    
    setAllocations(initialAllocations);
    setPhaseDescriptions(initialDescriptions);

    // Initialize all projects as collapsed
    const uniqueProjectIds = Array.from(new Set(phaseAllocations.map(alloc => alloc.phase.project.id)));
    setCollapsedProjects(new Set(uniqueProjectIds));
    
    // Initialize all phases as collapsed
    const uniquePhaseIds = Array.from(new Set(phaseAllocations.map(alloc => alloc.id)));
    setCollapsedPhases(new Set(uniquePhaseIds));
    
    // Clear any unsaved descriptions when new data loads
    setUnsavedDescriptions(new Map());
  }, [phaseAllocations]);

  const handleHourChange = (phaseAllocationId: string, weekNumber: number, year: number, value: string) => {
    const key = `${phaseAllocationId}-${weekNumber}-${year}`;
    const hours = parseFloat(value) || 0;
    
    // Get the phase allocation to check total hours limit
    const phaseAlloc = phaseAllocations.find(p => p.id === phaseAllocationId);
    if (phaseAlloc) {
      // Calculate what the new total would be
      const newAllocations = new Map(allocations);
      newAllocations.set(key, hours);
      
      let newTotalDistributed = 0;
      newAllocations.forEach((h, k) => {
        if (k.startsWith(`${phaseAllocationId}-`)) {
          newTotalDistributed += h;
        }
      });
      
      // Check if this would exceed the allocated total
      if (newTotalDistributed > phaseAlloc.totalHours) {
        const excess = newTotalDistributed - phaseAlloc.totalHours;
        setErrors(prev => new Map(prev.set(key, 
          `This would exceed your allocated ${formatHours(phaseAlloc.totalHours)} by ${formatHours(excess)}. Create an Hour Change Request if you need more hours.`
        )));
        // Don't save the invalid value
        return;
      }
    }
    
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


  const isFirstTimePlanning = (phaseAllocationId: string) => {
    const phaseAllocation = phaseAllocations.find(p => p.id === phaseAllocationId);
    if (!phaseAllocation) return false;
    
    // Check if this phase has any existing weekly allocations with hours > 0
    const hasExistingHours = phaseAllocation.weeklyAllocations.some(w => w.plannedHours > 0);
    return !hasExistingHours;
  };

  const requiresDescription = (phaseAlloc: PhaseAllocation) => {
    // Requires description if:
    // 1. It's the first time planning (no existing hours)
    // 2. AND there's no existing description
    // 3. AND the consultant has planned some hours now
    const hasPlannedHours = Array.from(allocations.entries()).some(([key, hours]) => 
      key.startsWith(`${phaseAlloc.id}-`) && hours > 0
    );
    
    return isFirstTimePlanning(phaseAlloc.id) && 
           !phaseAlloc.consultantDescription && 
           hasPlannedHours;
  };

  const checkDescriptionRequirement = (phaseAlloc: PhaseAllocation) => {
    if (requiresDescription(phaseAlloc)) {
      const currentDescription = phaseDescriptions.get(phaseAlloc.id);
      const unsavedDesc = unsavedDescriptions.get(phaseAlloc.id);
      
      if (!currentDescription?.trim() && !unsavedDesc?.trim()) {
        setShowDescriptionModal(phaseAlloc.id);
        return false;
      }
    }
    return true;
  };

  const savePhaseAllocations = async (phaseAllocationId: string) => {
    // For first-time planning, check if description is required and missing
    const phaseAllocation = phaseAllocations.find(p => p.id === phaseAllocationId);
    if (phaseAllocation && requiresDescription(phaseAllocation) && !checkDescriptionRequirement(phaseAllocation)) {
      return; // Modal will be shown, don't continue with save
    }
    
    const phaseKeys = Array.from(unsavedChanges).filter(key => key.startsWith(`${phaseAllocationId}-`));
    const hasUnsavedDescription = unsavedDescriptions.has(phaseAllocationId);
    
    if (phaseKeys.length === 0 && !hasUnsavedDescription) return;

    setSaving(true);
    try {
      // Handle hour allocations
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

      // Handle description update separately if needed
      const unsavedDesc = unsavedDescriptions.get(phaseAllocationId);
      if (unsavedDesc !== undefined) {
        savePromises.push(
          axios.post('/api/allocations/weekly', {
            phaseAllocationId,
            weekStartDate: new Date().toISOString(), // Dummy date for description-only updates
            plannedHours: 0, // Dummy hours for description-only updates
            consultantDescription: unsavedDesc.trim()
          })
        );
      }

      await Promise.all(savePromises);
      
      // Update saved description if it was provided
      if (unsavedDesc !== undefined) {
        const newDescriptions = new Map(phaseDescriptions);
        newDescriptions.set(phaseAllocationId, unsavedDesc.trim());
        setPhaseDescriptions(newDescriptions);
        
        // Clear unsaved description
        const newUnsaved = new Map(unsavedDescriptions);
        newUnsaved.delete(phaseAllocationId);
        setUnsavedDescriptions(newUnsaved);
      }
      
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

  // Group weeks by their corresponding sprints
  const getPhaseWeeksBySprint = (phase: PhaseAllocation['phase']) => {
    if (phase.sprints.length === 0) return [];

    const sprintWeeks = phase.sprints.map(sprint => {
      // For 2-week sprints, calculate exactly 2 weeks from start date
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      
      // Get all weeks but limit to exactly what the sprint should contain
      const allWeeks = getWeeksBetween(startDate, endDate);
      
      // For 2-week sprints, we should have exactly 2 weeks
      // If we have more, it's likely due to overlap, so take only the first 2
      const weeks = allWeeks.slice(0, 2);
      
      return {
        sprint,
        weeks: weeks
      };
    });

    // Sort by sprint number
    return sprintWeeks.sort((a, b) => a.sprint.sprintNumber - b.sprint.sprintNumber);
  };

  // Calculate total hours for a specific sprint in a phase allocation
  const getSprintTotal = (phaseAllocationId: string, sprint: any) => {
    // Use the same logic as getPhaseWeeksBySprint to ensure consistency
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const allWeeks = getWeeksBetween(startDate, endDate);
    // For 2-week sprints, take only the first 2 weeks to avoid overlap
    const sprintWeeks = allWeeks.slice(0, 2);
    
    let total = 0;
    
    sprintWeeks.forEach(week => {
      const key = `${phaseAllocationId}-${week.weekNumber}-${week.year}`;
      const hours = allocations.get(key) || 0;
      total += hours;
    });
    
    return total;
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

  // Sort phases within each project by start date, then by creation date
  Object.values(projectGroups).forEach((group: any) => {
    group.phases.sort((a: any, b: any) => {
      const aStartDate = new Date(a.phase.startDate).getTime();
      const bStartDate = new Date(b.phase.startDate).getTime();
      
      // Primary sort: by start date
      if (aStartDate !== bStartDate) {
        return aStartDate - bStartDate;
      }
      
      // Secondary sort: by creation date if start dates are the same
      const aCreatedAt = new Date(a.phase.createdAt).getTime();
      const bCreatedAt = new Date(b.phase.createdAt).getTime();
      return aCreatedAt - bCreatedAt;
    });
  });

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

  const handleDescriptionSave = async (phaseId: string, description: string) => {
    if (!description.trim()) {
      showNotification('error', 'Description is required for first-time planning.');
      return;
    }
    
    // Save the description to unsaved descriptions
    const newUnsaved = new Map(unsavedDescriptions);
    newUnsaved.set(phaseId, description.trim());
    setUnsavedDescriptions(newUnsaved);
    
    // Close modal
    setShowDescriptionModal(null);
    
    // Now save the allocations
    await savePhaseAllocations(phaseId);
  };
  
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Get other phases planned for the same week (excluding current phase)
  const getOtherPhasesForWeek = (weekNumber: number, year: number, currentPhaseId: string) => {
    const otherPhases: Array<{
      phaseId: string;
      phaseName: string;
      projectTitle: string;
      hours: number;
      projectColor: string;
    }> = [];
    
    phaseAllocations.forEach((phaseAlloc) => {
      // Skip the current phase we're editing
      if (phaseAlloc.id === currentPhaseId) return;
      
      const weeks = getPhaseWeeks(phaseAlloc.phase);
      const hasThisWeek = weeks.some(w => w.weekNumber === weekNumber && w.year === year);
      
      if (hasThisWeek) {
        const allocationKey = `${phaseAlloc.id}-${weekNumber}-${year}`;
        const hours = allocations.get(allocationKey) || 0;
        
        // Only include if there are planned hours
        if (hours > 0) {
          const projectColor = `hsl(${Math.abs(phaseAlloc.phase.project.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)`;
          
          otherPhases.push({
            phaseId: phaseAlloc.id,
            phaseName: phaseAlloc.phase.name,
            projectTitle: phaseAlloc.phase.project.title,
            hours,
            projectColor
          });
        }
      }
    });
    
    return otherPhases;
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

  const togglePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
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
      
      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Phase Description Required
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a brief description of what you plan to accomplish during this phase. This helps the Growth Team understand your planned work.
            </p>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
              placeholder="Describe your planned work for this phase..."
              value={unsavedDescriptions.get(showDescriptionModal) || ''}
              onChange={(e) => {
                const newUnsaved = new Map(unsavedDescriptions);
                newUnsaved.set(showDescriptionModal, e.target.value);
                setUnsavedDescriptions(newUnsaved);
              }}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowDescriptionModal(null);
                  // Clear any unsaved description for this phase
                  const newUnsaved = new Map(unsavedDescriptions);
                  newUnsaved.delete(showDescriptionModal);
                  setUnsavedDescriptions(newUnsaved);
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const description = unsavedDescriptions.get(showDescriptionModal) || '';
                  handleDescriptionSave(showDescriptionModal, description);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save & Continue
              </button>
            </div>
          </div>
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
                  const status = getPhaseAllocationStatus(phaseAlloc);
                  
                  return (
                    <div key={phaseAlloc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Phase Header */}
                      <div 
                        className="bg-gray-50 px-4 py-3 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => togglePhaseCollapse(phaseAlloc.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center">
                              {collapsedPhases.has(phaseAlloc.id) ? (
                                <FaChevronRight className="text-gray-500 text-sm" />
                              ) : (
                                <FaChevronDown className="text-gray-500 text-sm" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-800">
                                  {phaseAlloc.phase.name}
                                </h3>
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                  {phaseAlloc.phase.sprints.length} sprint{phaseAlloc.phase.sprints.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {phaseAlloc.phase.project.title} • {formatHours(phaseAlloc.totalHours)} total
                                {phaseAlloc.phase.sprints.length > 0 && (
                                  <span className="ml-2">
                                    • Sprint{phaseAlloc.phase.sprints.length > 1 ? 's' : ''} {
                                      phaseAlloc.phase.sprints
                                        .sort((a: any, b: any) => a.sprintNumber - b.sprintNumber)
                                        .map((sprint: any) => sprint.sprintNumber)
                                        .join(', ')
                                    }
                                  </span>
                                )}
                              </p>
                            </div>
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

                      {/* Sprint-based Weekly Allocation */}
                      {!collapsedPhases.has(phaseAlloc.id) && (
                        <div className="p-4">
                        {/* Phase Description */}
                        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-blue-800 mb-2">
                                Phase Description - What do you plan to accomplish?
                              </label>
                              <textarea
                                className="w-full p-3 text-sm border border-blue-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                rows={3}
                                placeholder="Describe what you plan to accomplish during this phase..."
                                value={(() => {
                                  const unsaved = unsavedDescriptions.get(phaseAlloc.id);
                                  if (unsaved !== undefined) return unsaved;
                                  const saved = phaseDescriptions.get(phaseAlloc.id);
                                  return saved || '';
                                })()}
                                onChange={(e) => {
                                  const newUnsaved = new Map(unsavedDescriptions);
                                  newUnsaved.set(phaseAlloc.id, e.target.value);
                                  setUnsavedDescriptions(newUnsaved);
                                }}
                              />
                              {unsavedDescriptions.has(phaseAlloc.id) && (
                                <div className="mt-2 text-xs text-blue-600">
                                  Description will be saved with your hour allocations
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const sprintWeeks = getPhaseWeeksBySprint(phaseAlloc.phase);
                          
                          if (sprintWeeks.length === 0) {
                            return (
                              <p className="text-gray-500 text-center py-4">
                                No sprints assigned to this phase yet.
                              </p>
                            );
                          }
                          
                          return (
                            <div className="space-y-5">
                              {sprintWeeks.map(({ sprint, weeks }) => {
                                const sprintTotal = getSprintTotal(phaseAlloc.id, sprint);
                                
                                return (
                                  <div key={sprint.id} className="border border-gray-200 border-l-4 border-l-blue-400 rounded-md overflow-hidden shadow-md bg-white">
                                    {/* Sprint Header */}
                                    <div className="bg-gradient-to-r from-blue-50 to-gray-50 px-3 py-2 border-b border-gray-200">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <h5 className="text-sm font-medium text-gray-700">
                                            Sprint {sprint.sprintNumber}
                                          </h5>
                                          <p className="text-xs text-gray-500">
                                            {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-blue-600">
                                            {formatHours(sprintTotal)}
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            total
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Sprint Weeks */}
                                    <div className="p-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {weeks.map((week) => {
                                          const weekNumber = week.weekNumber;
                                          const year = week.year;
                                          const key = `${phaseAlloc.id}-${weekNumber}-${year}`;
                                          const currentHours = allocations.get(key) || 0;
                                          const hasUnsavedChanges = unsavedChanges.has(key);
                                          const error = errors.get(key);
                                          
                                          // Get other phases planned for this same week
                                          const otherPhases = getOtherPhasesForWeek(weekNumber, year, phaseAlloc.id);
                                          
                                          return (
                                            <div key={key} className="border border-gray-200 rounded p-2 bg-white shadow-sm hover:shadow transition-shadow duration-150">
                                              <div className="mb-2">
                                                <div className="text-xs font-medium text-gray-700">
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
                                              
                                              {/* Show other phases planned for this week */}
                                              {otherPhases.length > 0 && (
                                                <div className="mt-2 pt-1 border-t border-gray-100">
                                                  <div className="text-xs text-gray-500 mb-1">
                                                    Other work:
                                                  </div>
                                                  <div className="space-y-0.5">
                                                    {otherPhases.map((phase) => (
                                                      <div 
                                                        key={phase.phaseId} 
                                                        className="flex items-center gap-1.5 text-xs"
                                                      >
                                                        <div 
                                                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                          style={{ backgroundColor: phase.projectColor }}
                                                        />
                                                        <div className="flex-1 min-w-0 truncate">
                                                          <span className="text-gray-600 font-medium">
                                                            {phase.projectTitle}
                                                          </span>
                                                          <span className="text-gray-400"> • {phase.phaseName}</span>
                                                        </div>
                                                        <span className="text-gray-600 font-medium text-xs">
                                                          {formatHours(phase.hours)}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {otherPhases.length === 0 && (
                                                <div className="mt-2 pt-1 border-t border-gray-100">
                                                  <div className="text-xs text-gray-400">
                                                    No other work
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {error && (
                                                <p className="mt-1 text-xs text-red-600">{error}</p>
                                              )}
                                              
                                              {hasUnsavedChanges && !error && (
                                                <p className="mt-1 text-xs text-yellow-600">Unsaved</p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        
                        {/* Phase Save Button */}
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => savePhaseAllocations(phaseAlloc.id)}
                            disabled={saving || (!Array.from(unsavedChanges).some(key => key.startsWith(`${phaseAlloc.id}-`)) && !unsavedDescriptions.has(phaseAlloc.id))}
                            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 ${
                              (Array.from(unsavedChanges).some(key => key.startsWith(`${phaseAlloc.id}-`)) || unsavedDescriptions.has(phaseAlloc.id)) && !saving
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <FaSave />
                            {saving ? 'Saving...' : 'Save Phase Allocations'}
                          </button>
                        </div>
                        </div>
                      )}
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
          <li>• Edit phase descriptions to explain what you plan to accomplish</li>
          <li>• Click the "Save Phase Allocations" button to save all changes for that phase</li>
          <li>• The progress bar shows how much of your total phase allocation you've distributed</li>
          <li>• Aim to distribute all your allocated hours across the phase duration</li>
          <li>• <strong>Need more hours?</strong> You cannot exceed your allocated total - create an Hour Change Request instead</li>
        </ul>
      </div>
    </div>
  );
}