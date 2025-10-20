'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  getWeeksBetween,
  formatHours,
  formatDate
} from '@/lib/dates';
import { FaSave, FaChevronDown, FaChevronRight, FaCheckCircle, FaTimes, FaCheck, FaClock, FaEye, FaEyeSlash, FaExternalLinkAlt } from 'react-icons/fa';
import Link from 'next/link';
import InstructionsPanel from './InstructionsPanel';
import WeeklyAllocationCard from './WeeklyAllocationCard';
import ProjectPlanningCard from './ProjectPlanningCard';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'FORFEITED';
  consultantDescription?: string | null; // Added for phase description
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
    proposedHours?: number | null;
    approvedHours?: number | null;
    planningStatus: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
    rejectionReason?: string | null;
    weekStartDate: Date;
    weekEndDate: Date;
  }>;
}

interface WeeklyPlannerEnhancedProps {
  consultantId: string;
  phaseAllocations: PhaseAllocation[];
  includeCompleted?: boolean;
  initialPhaseAllocationId?: string;
  initialWeek?: string;
  onDataChanged?: () => void; // Callback to refresh parent data
}

export default function WeeklyPlannerEnhanced({ phaseAllocations, includeCompleted = false, initialPhaseAllocationId, initialWeek, onDataChanged }: WeeklyPlannerEnhancedProps) {
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [phaseDescriptions, setPhaseDescriptions] = useState<Map<string, string>>(new Map());
  const [unsavedDescriptions, setUnsavedDescriptions] = useState<Map<string, string>>(new Map());
  const [showDescriptionModal, setShowDescriptionModal] = useState<string | null>(null);
  const [localWeeklyStatuses, setLocalWeeklyStatuses] = useState<Map<string, 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED'>>(new Map());
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [showUnplannedWarning, setShowUnplannedWarning] = useState<{
    show: boolean;
    phaseAllocationId: string;
    phaseName: string;
    totalHours: number;
    plannedHours: number;
    remainingHours: number;
  } | null>(null);

  useEffect(() => {
    // Initialize allocations from existing data (preserving all existing planning)
    const initialAllocations = new Map<string, number>();
    const initialDescriptions = new Map<string, string>();

    phaseAllocations.forEach((phaseAlloc) => {
      // Always load existing weekly allocations to preserve consultant's planning
      phaseAlloc.weeklyAllocations.forEach((allocation) => {
        const key = `${phaseAlloc.id}-${allocation.weekNumber}-${allocation.year}`;
        initialAllocations.set(key, allocation.approvedHours || allocation.proposedHours || 0);
      });

      // Always load phase descriptions
      if (phaseAlloc.consultantDescription) {
        initialDescriptions.set(phaseAlloc.id, phaseAlloc.consultantDescription);
      }
    });

    setAllocations(initialAllocations);
    setPhaseDescriptions(initialDescriptions);

    // Clear local status overrides when data refreshes from server
    setLocalWeeklyStatuses(new Map());

    // Clear any unsaved descriptions when new data loads
    setUnsavedDescriptions(new Map());
  }, [phaseAllocations]);

  // Handle deep linking to specific phase allocation
  useEffect(() => {
    if (initialPhaseAllocationId && phaseAllocations.length > 0) {
      // Find the phase allocation
      const targetAllocation = phaseAllocations.find(pa => pa.id === initialPhaseAllocationId);

      if (targetAllocation) {
        // Find and expand the parent project
        const projectId = targetAllocation.phase.project.id;
        setExpandedProject(projectId);

        // Collapse all phases in this project EXCEPT the target phase
        const projectPhases = phaseAllocations
          .filter(pa => pa.phase.project.id === projectId)
          .map(pa => pa.id)
          .filter(id => id !== initialPhaseAllocationId);

        setCollapsedPhases(new Set(projectPhases));

        // Scroll to the phase allocation after a brief delay to allow rendering
        setTimeout(() => {
          const element = document.getElementById(`phase-allocation-${initialPhaseAllocationId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Add temporary highlight effect
            element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50');
            }, 2000);
          }
        }, 300);
      }
    }
  }, [initialPhaseAllocationId, phaseAllocations]);

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
    const hasExistingHours = phaseAllocation.weeklyAllocations.some(w => (w.approvedHours || w.proposedHours || 0) > 0);
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

  const validatePlannedHours = (phaseAllocationId: string): boolean => {
    const phaseAlloc = phaseAllocations.find(p => p.id === phaseAllocationId);
    if (!phaseAlloc) return true;

    const weeks = getWeeksBetween(
      new Date(phaseAlloc.phase.startDate),
      new Date(phaseAlloc.phase.endDate)
    );

    let plannedHours = 0;
    weeks.forEach((week) => {
      const key = `${phaseAllocationId}-${week.weekNumber}-${week.year}`;
      plannedHours += allocations.get(key) || 0;
    });

    const remainingHours = phaseAlloc.totalHours - plannedHours;

    if (remainingHours > 0) {
      setShowUnplannedWarning({
        show: true,
        phaseAllocationId,
        phaseName: phaseAlloc.phase.name,
        totalHours: phaseAlloc.totalHours,
        plannedHours,
        remainingHours
      });
      return false;
    }

    return true;
  };

  const savePhaseAllocations = async (phaseAllocationId: string, skipValidation = false) => {
    // For first-time planning, check if description is required and missing
    const phaseAllocation = phaseAllocations.find(p => p.id === phaseAllocationId);
    if (phaseAllocation && requiresDescription(phaseAllocation) && !checkDescriptionRequirement(phaseAllocation)) {
      return; // Modal will be shown, don't continue with save
    }

    // Validate planned hours unless skipping validation (when user chooses "Proceed Anyway")
    if (!skipValidation && !validatePlannedHours(phaseAllocationId)) {
      return; // Warning modal will be shown, don't continue with save
    }

    const phaseKeys = Array.from(unsavedChanges).filter(key => key.startsWith(`${phaseAllocationId}-`));
    const hasUnsavedDescription = unsavedDescriptions.has(phaseAllocationId);

    if (phaseKeys.length === 0 && !hasUnsavedDescription) return;

    setSaving(true);
    try {
      // Prepare batch weeks data for all allocations
      const phaseAlloc = phaseAllocations.find(pa => pa.id === phaseAllocationId);
      if (!phaseAlloc) {
        throw new Error('Phase allocation not found');
      }

      const weeks = getPhaseWeeks(phaseAlloc.phase);
      const weeksData = phaseKeys.map(key => {
        const [, weekNumber, year] = key.split('-');
        const hours = allocations.get(key) || 0;

        const week = weeks.find(w => w.weekNumber === parseInt(weekNumber) && w.year === parseInt(year));
        if (!week) {
          throw new Error('Week not found');
        }

        // Find the corresponding weekly allocation to check if it was rejected
        const weeklyAllocation = phaseAlloc.weeklyAllocations.find(
          wa => wa.weekNumber === parseInt(weekNumber) && wa.year === parseInt(year)
        );
        const wasRejected = weeklyAllocation?.planningStatus === 'REJECTED';

        return {
          weekStartDate: week.weekStart.toISOString(),
          plannedHours: hours,
          clearRejection: wasRejected
        };
      });

      // Handle description update
      const unsavedDesc = unsavedDescriptions.get(phaseAllocationId);

      if (phaseKeys.length > 0) {
        // Send batch request with all weeks and optional description - this sends ONE notification
        await axios.post('/api/allocations/weekly', {
          phaseAllocationId,
          weeks: weeksData,
          consultantDescription: unsavedDesc !== undefined ? unsavedDesc.trim() : undefined
        });
      } else if (unsavedDesc !== undefined) {
        // Description-only update - use separate API endpoint
        await axios.put(
          `/api/phases/${phaseAlloc.phase.id}/allocations/${phaseAllocationId}/description`,
          { consultantDescription: unsavedDesc.trim() }
        );
      }

      // Update local weekly statuses to PENDING for modified weeks
      setLocalWeeklyStatuses(prev => {
        const newStatuses = new Map(prev);
        phaseKeys.forEach(key => {
          newStatuses.set(key, 'PENDING');
        });
        return newStatuses;
      });

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

  // Group allocations by project (exclude EXPIRED and FORFEITED allocations)
  const projectGroups = phaseAllocations
    .filter(allocation => allocation.approvalStatus !== 'EXPIRED' && allocation.approvalStatus !== 'FORFEITED')
    .reduce((groups: any, allocation: any) => {
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

    // Add earliest phase start date to the group for project-level sorting
    group.earliestStartDate = group.phases.length > 0
      ? new Date(Math.min(...group.phases.map((p: any) => new Date(p.phase.startDate).getTime())))
      : new Date();
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

  const toggleProjectExpand = (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null); // Collapse if already expanded
    } else {
      setExpandedProject(projectId); // Expand this project and collapse others
      // Keep all phases collapsed by default - only deep linking should expand phases
      const projectPhases = phaseAllocations
        .filter(pa => pa.phase.project.id === projectId)
        .map(pa => pa.id);
      setCollapsedPhases(new Set(projectPhases));
    }
  };

  // Calculate project card statistics
  const calculateProjectStats = (projectPhases: any[]) => {
    let totalAllocated = 0;
    let totalPlanned = 0;
    let phasesFullyPlanned = 0;
    let nearestDeadline: Date | undefined;
    let earliestStartDate: Date | undefined;
    let hasUrgentUnplannedPhase = false; // Track if any urgent phase needs planning
    const approvalStatus = { pending: 0, approved: 0, rejected: 0 };
    const weeklyStatus = { pendingWeeks: 0, approvedWeeks: 0, rejectedWeeks: 0, modifiedWeeks: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    projectPhases.forEach((phaseAlloc) => {
      totalAllocated += phaseAlloc.totalHours;

      // Calculate planned hours for this phase
      let phasePlanned = 0;
      let phaseFullyApproved = false;
      const weeks = getWeeksBetween(
        new Date(phaseAlloc.phase.startDate),
        new Date(phaseAlloc.phase.endDate)
      );

      weeks.forEach((week) => {
        const key = `${phaseAlloc.id}-${week.weekNumber}-${week.year}`;
        const hours = allocations.get(key) || 0;
        phasePlanned += hours;

        // Check weekly allocation status
        const weeklyAllocation = phaseAlloc.weeklyAllocations.find(
          (wa: any) => wa.weekNumber === week.weekNumber && wa.year === week.year
        );
        const localStatus = localWeeklyStatuses.get(key);
        const finalStatus = localStatus || weeklyAllocation?.planningStatus;

        // Count weekly statuses (only for weeks with hours)
        if (hours > 0 || (weeklyAllocation && (weeklyAllocation.proposedHours || 0) > 0)) {
          if (finalStatus === 'PENDING') {
            weeklyStatus.pendingWeeks++;
          } else if (finalStatus === 'APPROVED') {
            weeklyStatus.approvedWeeks++;
          } else if (finalStatus === 'REJECTED') {
            weeklyStatus.rejectedWeeks++;
          } else if (finalStatus === 'MODIFIED') {
            weeklyStatus.modifiedWeeks++;
          }
        }
      });

      totalPlanned += phasePlanned;

      // Check if phase is fully planned AND approved
      // A phase is fully planned when all hours are distributed AND all weekly allocations are approved
      const allWeeksApproved = weeks.every((week) => {
        const key = `${phaseAlloc.id}-${week.weekNumber}-${week.year}`;
        const hours = allocations.get(key) || 0;
        if (hours === 0) return true; // Weeks with no hours don't need approval

        const weeklyAllocation = phaseAlloc.weeklyAllocations.find(
          (wa: any) => wa.weekNumber === week.weekNumber && wa.year === week.year
        );
        const localStatus = localWeeklyStatuses.get(key);
        const finalStatus = localStatus || weeklyAllocation?.planningStatus;

        return finalStatus === 'APPROVED' || finalStatus === 'MODIFIED';
      });

      if (phasePlanned >= phaseAlloc.totalHours && phaseAlloc.approvalStatus === 'APPROVED' && allWeeksApproved) {
        phasesFullyPlanned++;
      }

      // Check if this phase is urgent and unplanned
      // A phase is urgent if it has started or starts within 7 days, and is not fully planned
      const phaseStartDate = new Date(phaseAlloc.phase.startDate);
      phaseStartDate.setHours(0, 0, 0, 0);
      const phaseEndDate = new Date(phaseAlloc.phase.endDate);
      phaseEndDate.setHours(0, 0, 0, 0);

      const hasPhaseStarted = phaseStartDate.getTime() <= today.getTime();
      const hasPhaseEnded = phaseEndDate.getTime() < today.getTime();
      const daysUntilStart = Math.ceil((phaseStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isPhasePlanned = phasePlanned >= phaseAlloc.totalHours && phaseAlloc.approvalStatus === 'APPROVED' && allWeeksApproved;

      // Phase is urgent if: (started or starting within 7 days) AND not ended AND not fully planned
      if ((hasPhaseStarted || daysUntilStart <= 7) && !hasPhaseEnded && !isPhasePlanned) {
        hasUrgentUnplannedPhase = true;
      }

      // Track latest deadline (furthest phase end date) and earliest start date
      if (!nearestDeadline || phaseEndDate > nearestDeadline) {
        nearestDeadline = phaseEndDate;
      }

      if (!earliestStartDate || phaseStartDate < earliestStartDate) {
        earliestStartDate = phaseStartDate;
      }

      // Count phase allocation approval statuses
      if (phaseAlloc.approvalStatus === 'PENDING') {
        approvalStatus.pending++;
      } else if (phaseAlloc.approvalStatus === 'APPROVED') {
        approvalStatus.approved++;
      } else if (phaseAlloc.approvalStatus === 'REJECTED') {
        approvalStatus.rejected++;
      }
    });

    const completionPercentage = totalAllocated > 0
      ? Math.round((totalPlanned / totalAllocated) * 100)
      : 0;

    return {
      totalAllocatedHours: totalAllocated,
      totalPlannedHours: totalPlanned,
      phasesFullyPlanned,
      totalPhases: projectPhases.length,
      completionPercentage,
      nearestDeadline,
      earliestStartDate,
      approvalStatus,
      weeklyStatus,
      hasUrgentUnplannedPhase
    };
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
    <div className="space-y-6">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
                  <FaClock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Weekly Hour Planner</h2>
                  <p className="text-blue-100 dark:text-blue-200 text-sm">Distribute your allocated hours across weeks</p>
                </div>
              </div>
              <Link
                href={`/dashboard/weekly-planner${includeCompleted ? '' : '?includeCompleted=true'}`}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 rounded-lg transition-colors text-white text-sm font-medium"
              >
                {includeCompleted ? (
                  <>
                    <FaEyeSlash className="w-4 h-4" />
                    Hide Completed
                  </>
                ) : (
                  <>
                    <FaEye className="w-4 h-4" />
                    Show Completed
                  </>
                )}
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl backdrop-blur-sm transition-all duration-500 transform ${
          notification.type === 'success'
            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border border-emerald-400'
            : 'bg-gradient-to-r from-red-500 to-rose-500 text-white border border-red-400'
        }`}>
          <div className="p-1 rounded-full bg-white/20">
            {notification.type === 'success' ? <FaCheckCircle className="w-4 h-4" /> : <FaTimes className="w-4 h-4" />}
          </div>
          <span className="font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <FaTimes className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 w-full max-w-lg transform transition-all duration-300 scale-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Phase Description Required
                </h3>
                <p className="text-sm text-muted-foreground">Define your work plan</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Please provide a brief description of what you plan to accomplish during this phase. This helps the Growth Team understand your planned work.
            </p>
            <textarea
              className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 text-sm leading-relaxed bg-white dark:bg-gray-800 text-foreground"
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
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDescriptionModal(null);
                  // Clear any unsaved description for this phase
                  const newUnsaved = new Map(unsavedDescriptions);
                  newUnsaved.delete(showDescriptionModal);
                  setUnsavedDescriptions(newUnsaved);
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const description = unsavedDescriptions.get(showDescriptionModal) || '';
                  handleDescriptionSave(showDescriptionModal, description);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-800 dark:hover:to-purple-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unplanned Hours Warning Modal */}
      {showUnplannedWarning && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 w-full max-w-lg transform transition-all duration-300 scale-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Incomplete Hour Planning
                </h3>
                <p className="text-sm text-muted-foreground">Not all hours distributed</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                You haven't planned all of your allocated hours for <span className="font-bold">{showUnplannedWarning.phaseName}</span>.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Allocated:</span>
                  <span className="font-bold text-foreground">{formatHours(showUnplannedWarning.totalHours)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Planned So Far:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatHours(showUnplannedWarning.plannedHours)}</span>
                </div>
                <div className="h-px bg-amber-200 dark:bg-amber-800 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{formatHours(showUnplannedWarning.remainingHours)}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              You still have <span className="font-bold text-amber-600 dark:text-amber-400">{formatHours(showUnplannedWarning.remainingHours)}</span> to plan.
              Would you like to go back and distribute these hours, or proceed with partial planning?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUnplannedWarning(null)}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Go Back to Plan
              </button>
              <button
                onClick={() => {
                  const phaseId = showUnplannedWarning.phaseAllocationId;
                  setShowUnplannedWarning(null);
                  savePhaseAllocations(phaseId, true); // Skip validation
                }}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-700 dark:to-orange-700 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 dark:hover:from-amber-800 dark:hover:to-orange-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Project Filter - Matching Approvals Dashboard Style */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Project Filter</h3>
                  <p className="text-sm text-muted-foreground">Focus on specific project allocations</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject('all')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-card-foreground bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filter
              </button>
            </div>
          </div>

          {/* Filter Section */}
          <div className="px-6 py-5 bg-white dark:bg-gray-900">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Select Project
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <select
                  id="projectFilter"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full pl-10 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 appearance-none [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-gray-100"
                >
                  <option value="all">All Projects</option>
                  {uniqueProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-t border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                <p className="text-sm font-medium text-card-foreground">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{Object.keys(filteredProjectGroups).length}</span>
                  <span className="text-muted-foreground mx-1">of</span>
                  <span className="font-bold">{Object.keys(projectGroups).length}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">
                    project{Object.keys(projectGroups).length !== 1 ? 's' : ''} shown
                  </span>
                </p>
              </div>
              {selectedProject !== 'all' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                      Filtered
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Allocations by Project */}
      <div className="space-y-8">
        {Object.keys(filteredProjectGroups).length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Phase Allocations</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Contact your Product Manager to assign you to project phases and start planning your weekly hours.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(filteredProjectGroups)
              .sort((a: any, b: any) => {
                // Sort projects by earliest phase start date for this consultant
                return a.earliestStartDate.getTime() - b.earliestStartDate.getTime();
              })
              .map((group: any) => {
              const stats = calculateProjectStats(group.phases);
              const isExpanded = expandedProject === group.project.id;

              return (
                <div key={group.project.id} className={`${isExpanded ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                  {!isExpanded ? (
                    <ProjectPlanningCard
                      project={group.project}
                      totalPhases={stats.totalPhases}
                      phasesFullyPlanned={stats.phasesFullyPlanned}
                      totalAllocatedHours={stats.totalAllocatedHours}
                      totalPlannedHours={stats.totalPlannedHours}
                      completionPercentage={stats.completionPercentage}
                      nearestDeadline={stats.nearestDeadline}
                      earliestStartDate={stats.earliestStartDate}
                      approvalStatus={stats.approvalStatus}
                      weeklyStatus={stats.weeklyStatus}
                      hasUrgentUnplannedPhase={stats.hasUrgentUnplannedPhase}
                      isExpanded={false}
                      onClick={() => toggleProjectExpand(group.project.id)}
                    />
                  ) : (
                    <div className="bg-white dark:bg-gray-900 border-2 border-blue-500 dark:border-blue-400 rounded-2xl shadow-xl overflow-hidden">
                      {/* Project Header with Close Button */}
                      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-blue-900/30 dark:to-indigo-900/30 px-8 py-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className="w-6 h-6 rounded-xl shadow-sm"
                              style={{ backgroundColor: `hsl(${Math.abs(group.project.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)` }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-2xl font-bold text-foreground">{group.project.title}</h3>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                  {group.phases.length} phase{group.phases.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {group.project.description && (
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{group.project.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Close and View Project Buttons */}
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/projects/${group.project.id}`}
                              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FaExternalLinkAlt className="w-3 h-3" />
                              View Project
                            </Link>
                            <button
                              onClick={() => setExpandedProject(null)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              <FaTimes className="w-3 h-3" />
                              Close
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Phases within Expanded Project */}
                      <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-800/30">
                        {group.phases.map((phaseAlloc: any) => {
                  const status = getPhaseAllocationStatus(phaseAlloc);

                  // Check if phase is complete (past end date)
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const phaseEnd = new Date(phaseAlloc.phase.endDate);
                  phaseEnd.setHours(0, 0, 0, 0);
                  const isPhaseComplete = today > phaseEnd;

                  return (
                    <div
                      key={phaseAlloc.id}
                      id={`phase-allocation-${phaseAlloc.id}`}
                      className={`border rounded-2xl overflow-hidden shadow-md transition-all duration-300 ${
                        isPhaseComplete
                          ? 'border-gray-400 dark:border-gray-600 opacity-80'
                          : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
                      } bg-white dark:bg-gray-900`}
                    >
                      {/* Phase Header */}
                      <div
                        className={`relative px-6 py-5 transition-all duration-300 group ${
                          isPhaseComplete
                            ? 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border-b border-gray-400 dark:border-gray-500 cursor-not-allowed'
                            : phaseAlloc.approvalStatus === 'PENDING'
                            ? 'bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 border-b border-orange-200 dark:border-orange-700 hover:from-orange-100 hover:to-yellow-100 dark:hover:from-orange-900/40 dark:hover:to-yellow-900/40 cursor-pointer'
                            : phaseAlloc.approvalStatus === 'APPROVED'
                            ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-b border-emerald-200 dark:border-emerald-700 hover:from-emerald-100 hover:to-green-100 dark:hover:from-emerald-900/40 dark:hover:to-green-900/40 cursor-pointer'
                            : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-b border-gray-200 dark:border-gray-700 hover:from-gray-100 hover:to-slate-100 dark:hover:from-gray-700 dark:hover:to-slate-700 cursor-pointer'
                        }`}
                        onClick={() => !isPhaseComplete && togglePhaseCollapse(phaseAlloc.id)}
                      >
                        {/* Pending approval diagonal stripes - only on header */}
                        {phaseAlloc.approvalStatus === 'PENDING' && (
                          <div className="absolute inset-0 pointer-events-none opacity-20"
                               style={{
                                 backgroundImage: `repeating-linear-gradient(
                                   45deg,
                                   transparent,
                                   transparent 8px,
                                   rgba(249, 115, 22, 0.3) 8px,
                                   rgba(249, 115, 22, 0.3) 16px
                                 )`
                               }}>
                          </div>
                        )}
                        <div className="relative z-10 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            {/* Hide chevron for completed phases since they can't be expanded */}
                            {!isPhaseComplete && (
                              <div className="flex items-center p-2 rounded-lg bg-white/80 shadow-sm group-hover:shadow-md transition-shadow">
                                {collapsedPhases.has(phaseAlloc.id) ? (
                                  <FaChevronRight className="text-gray-600 w-4 h-4" />
                                ) : (
                                  <FaChevronDown className="text-gray-600 w-4 h-4" />
                                )}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-3 flex-wrap mb-2">
                                <h3 className={`text-xl font-bold ${isPhaseComplete ? 'text-gray-600 dark:text-gray-400' : 'text-foreground'}`}>
                                  {phaseAlloc.phase.name}
                                </h3>

                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  {phaseAlloc.phase.sprints.length} sprint{phaseAlloc.phase.sprints.length !== 1 ? 's' : ''}
                                </span>

                                {/* Phase Timeline Status Indicator */}
                                {(() => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const phaseStart = new Date(phaseAlloc.phase.startDate);
                                  phaseStart.setHours(0, 0, 0, 0);
                                  const phaseEnd = new Date(phaseAlloc.phase.endDate);
                                  phaseEnd.setHours(0, 0, 0, 0);

                                  const hasStarted = phaseStart.getTime() <= today.getTime();
                                  const hasEnded = phaseEnd.getTime() < today.getTime();
                                  const daysUntilStart = Math.ceil((phaseStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                                  // Check if planning is complete
                                  const phaseStatus = getPhaseAllocationStatus(phaseAlloc);
                                  const isPlanningComplete = phaseStatus.percentage >= 100;

                                  if (hasEnded) {
                                    // Phase has ended
                                    return (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                                        <FaCheckCircle className="w-3 h-3" />
                                        Phase Completed
                                      </span>
                                    );
                                  } else if (hasStarted) {
                                    // Phase is in progress
                                    if (!isPlanningComplete) {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-300 dark:border-red-700 animate-pulse">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                          </svg>
                                          In Progress - Plan Hours!
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                          <FaClock className="w-3 h-3" />
                                          In Progress
                                        </span>
                                      );
                                    }
                                  } else {
                                    // Phase hasn't started yet
                                    if (daysUntilStart === 0) {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
                                          <FaClock className="w-3 h-3" />
                                          Starts Today
                                        </span>
                                      );
                                    } else if (daysUntilStart === 1) {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700">
                                          <FaClock className="w-3 h-3" />
                                          Starts Tomorrow
                                        </span>
                                      );
                                    } else if (daysUntilStart <= 7) {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700">
                                          <FaClock className="w-3 h-3" />
                                          Starts in {daysUntilStart}d
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                                          <FaClock className="w-3 h-3" />
                                          Starts in {Math.ceil(daysUntilStart / 7)}w
                                        </span>
                                      );
                                    }
                                  }
                                })()}

                                {/* Phase Allocation Approval Status */}
                                {phaseAlloc.approvalStatus === 'PENDING' && (
                                  <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/40 dark:to-yellow-900/40 border border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200 rounded-full text-xs font-semibold shadow-sm">
                                    <span className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full animate-pulse shadow-sm"></span>
                                    Allocation Pending
                                  </span>
                                )}
                                {phaseAlloc.approvalStatus === 'REJECTED' && (
                                  <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 rounded-full text-xs font-semibold shadow-sm">
                                    <FaTimes className="w-3 h-3" />
                                    Allocation Rejected
                                  </span>
                                )}
                                {phaseAlloc.approvalStatus === 'APPROVED' && (
                                  <span className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-full text-xs font-semibold shadow-sm">
                                    <FaCheckCircle className="w-3 h-3" />
                                    Allocation Approved
                                  </span>
                                )}

                                {/* Weekly Planning Approval Status */}
                                {(() => {
                                  // Calculate status counts considering both server state and local overrides
                                  let pendingWeeklyCount = 0;
                                  let rejectedWeeklyCount = 0;
                                  let approvedWeeklyCount = 0;

                                  // Check all potential weeks for this phase, including local modifications
                                  const phaseWeeks = getPhaseWeeks(phaseAlloc.phase);
                                  phaseWeeks.forEach(week => {
                                    const key = `${phaseAlloc.id}-${week.weekNumber}-${week.year}`;
                                    const weeklyAllocation = phaseAlloc.weeklyAllocations.find(
                                      (wa: any) => wa.weekNumber === week.weekNumber && wa.year === week.year
                                    );

                                    // Check for local override status first, then fallback to server status
                                    const localStatus = localWeeklyStatuses.get(key);
                                    const finalStatus = localStatus || weeklyAllocation?.planningStatus;

                                    // Only count weeks that have been planned (have hours allocated)
                                    const hasPlannedHours = (allocations.get(key) || 0) > 0 || (weeklyAllocation?.proposedHours || 0) > 0;

                                    if (hasPlannedHours && finalStatus) {
                                      if (finalStatus === 'PENDING') {
                                        pendingWeeklyCount++;
                                      } else if (finalStatus === 'REJECTED') {
                                        rejectedWeeklyCount++;
                                      } else if (finalStatus === 'APPROVED' || finalStatus === 'MODIFIED') {
                                        approvedWeeklyCount++;
                                      }
                                    }
                                  });

                                  // const totalWeeklyCount = pendingWeeklyCount + rejectedWeeklyCount + approvedWeeklyCount;

                                  // Priority: Show all statuses when mixed, otherwise show single status
                                  if (pendingWeeklyCount > 0 && (rejectedWeeklyCount > 0 || approvedWeeklyCount > 0)) {
                                    // Mixed status - show all
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                                          <span className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-pulse"></span>
                                          {pendingWeeklyCount} Pending
                                        </span>
                                        {approvedWeeklyCount > 0 && (
                                          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                                            <FaCheck className="w-2 h-2" />
                                            {approvedWeeklyCount} Approved
                                          </span>
                                        )}
                                        {rejectedWeeklyCount > 0 && (
                                          <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                                            <FaTimes className="w-2 h-2" />
                                            {rejectedWeeklyCount} Rejected
                                          </span>
                                        )}
                                      </div>
                                    );
                                  } else if (pendingWeeklyCount > 0) {
                                    return (
                                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                                        <span className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-pulse"></span>
                                        {pendingWeeklyCount} Week{pendingWeeklyCount !== 1 ? 's' : ''} Pending Review
                                      </span>
                                    );
                                  } else if (rejectedWeeklyCount > 0 && approvedWeeklyCount > 0) {
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                                          <FaCheck className="w-2 h-2" />
                                          {approvedWeeklyCount} Week{approvedWeeklyCount !== 1 ? 's' : ''} Approved
                                        </span>
                                        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                                          <FaTimes className="w-2 h-2" />
                                          {rejectedWeeklyCount} Week{rejectedWeeklyCount !== 1 ? 's' : ''} Rejected
                                        </span>
                                      </div>
                                    );
                                  } else if (rejectedWeeklyCount > 0) {
                                    return (
                                      <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                                        <FaTimes className="w-2 h-2" />
                                        {rejectedWeeklyCount} Week{rejectedWeeklyCount !== 1 ? 's' : ''} Rejected
                                      </span>
                                    );
                                  } else if (approvedWeeklyCount > 0) {
                                    return (
                                      <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                                        <FaCheckCircle className="w-2 h-2" />
                                        {approvedWeeklyCount} Week{approvedWeeklyCount !== 1 ? 's' : ''} Approved
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">{phaseAlloc.phase.project.title}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatHours(phaseAlloc.totalHours)} total
                                  </span>
                                  {phaseAlloc.phase.sprints.length > 0 && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <span>
                                        Sprint{phaseAlloc.phase.sprints.length > 1 ? 's' : ''} {
                                          phaseAlloc.phase.sprints
                                            .sort((a: any, b: any) => a.sprintNumber - b.sprintNumber)
                                            .map((sprint: any) => sprint.sprintNumber)
                                            .join(', ')
                                        }
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>
                                    {new Date(phaseAlloc.phase.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    <span className="mx-1.5">→</span>
                                    {new Date(phaseAlloc.phase.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="bg-white/70 rounded-xl p-4 shadow-sm border border-gray-200">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-muted-foreground">Allocated</span>
                                  <span className="text-sm font-bold text-foreground">{formatHours(status.allocated)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-muted-foreground">Distributed</span>
                                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatHours(status.distributed)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                                  <span className={`text-sm font-bold ${
                                    status.remaining === 0 ? 'text-emerald-600 dark:text-emerald-400' :
                                    status.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                                  }`}>
                                    {status.remaining === 0 ? 'Complete' :
                                     status.remaining < 0 ? `+${formatHours(Math.abs(status.remaining))}` :
                                     formatHours(status.remaining)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Distribution Progress</span>
                            <span className="text-xs font-bold text-foreground">{Math.round(status.percentage)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                                status.percentage > 100 ? 'bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700' :
                                status.percentage === 100 ? 'bg-gradient-to-r from-emerald-500 to-green-500 dark:from-emerald-600 dark:to-green-600' :
                                'bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600'
                              }`}
                              style={{ width: `${Math.min(status.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sprint-based Weekly Allocation */}
                      {!collapsedPhases.has(phaseAlloc.id) && (
                        <div className="p-6 bg-gradient-to-br from-gray-50/30 to-transparent dark:from-gray-800/20">
                          {/* Show planning interface only for approved allocations */}
                          {phaseAlloc.approvalStatus === 'APPROVED' ? (
                            <div>
                        {/* Enhanced Phase Description */}
                        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-sm">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <label className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                  Phase Description
                                </label>
                                <span className="text-sm text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-lg">
                                  What do you plan to accomplish?
                                </span>
                              </div>
                              <textarea
                                className="w-full p-4 text-sm border border-blue-200 dark:border-blue-700 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-200 shadow-sm text-foreground"
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
                                <div className="mt-3 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-3 py-2 rounded-lg">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
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
                              <p className="text-muted-foreground text-center py-4">
                                No sprints assigned to this phase yet.
                              </p>
                            );
                          }
                          
                          return (
                            <div className="space-y-6">
                              {sprintWeeks.map(({ sprint, weeks }) => {
                                const sprintTotal = getSprintTotal(phaseAlloc.id, sprint);

                                return (
                                  <div key={sprint.id} className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900">
                                    {/* Enhanced Sprint Header */}
                                    <div className="bg-gradient-to-r from-slate-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:via-indigo-900/30 dark:to-blue-900/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 dark:from-indigo-600 dark:to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                                            <span className="text-white font-bold text-sm">{sprint.sprintNumber}</span>
                                          </div>
                                          <div>
                                            <h5 className="text-lg font-bold text-foreground">
                                              Sprint {sprint.sprintNumber}
                                            </h5>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                              {formatDate(new Date(sprint.startDate))} - {formatDate(new Date(sprint.endDate))}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl px-4 py-2 shadow-sm border border-indigo-200 dark:border-indigo-700">
                                            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                              {formatHours(sprintTotal)}
                                            </div>
                                            <div className="text-xs font-medium text-muted-foreground">
                                              total hours
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Enhanced Sprint Weeks */}
                                    <div className="p-6">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {weeks.map((week) => {
                                          const weekNumber = week.weekNumber;
                                          const year = week.year;
                                          const key = `${phaseAlloc.id}-${weekNumber}-${year}`;
                                          const currentHours = allocations.get(key) || 0;
                                          const hasUnsavedChanges = unsavedChanges.has(key);
                                          const error = errors.get(key);

                                          // Find the corresponding weekly allocation to check status
                                          const weeklyAllocation = phaseAlloc.weeklyAllocations.find(
                                            (wa: any) => wa.weekNumber === weekNumber && wa.year === year
                                          );
                                          // Check for local override status first, then fallback to server status
                                          const localStatus = localWeeklyStatuses.get(key);

                                          // Get other phases planned for this same week
                                          const otherPhases = getOtherPhasesForWeek(weekNumber, year, phaseAlloc.id);

                                          // Check if week has ended (past weeks cannot be edited)
                                          // Week is locked if the week end date is before the start of today
                                          const today = new Date();
                                          today.setHours(0, 0, 0, 0); // Start of today
                                          const weekEndDate = new Date(week.weekEnd);
                                          weekEndDate.setHours(23, 59, 59, 999); // End of week end date
                                          const isWeekLocked = weekEndDate < today;

                                          return (
                                            <WeeklyAllocationCard
                                              key={key}
                                              week={week}
                                              phaseAllocationId={phaseAlloc.id}
                                              currentHours={currentHours}
                                              hasUnsavedChanges={hasUnsavedChanges}
                                              error={error}
                                              weeklyAllocation={weeklyAllocation}
                                              localStatus={localStatus}
                                              otherPhases={otherPhases}
                                              onHourChange={(value) => handleHourChange(phaseAlloc.id, weekNumber, year, value)}
                                              isWeekLocked={isWeekLocked}
                                            />
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
                        
                        {/* Enhanced Informational Message */}
                        {(Array.from(unsavedChanges).some(key => key.startsWith(`${phaseAlloc.id}-`)) || unsavedDescriptions.has(phaseAlloc.id)) && (
                          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">Ready to Submit for Approval</h4>
                                <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                                  Your weekly planning will be submitted to the Growth Team for review. You can make changes until it's approved.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Enhanced Phase Save Button */}
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={() => savePhaseAllocations(phaseAlloc.id)}
                            disabled={saving || (!Array.from(unsavedChanges).some(key => key.startsWith(`${phaseAlloc.id}-`)) && !unsavedDescriptions.has(phaseAlloc.id))}
                            className={`px-8 py-4 text-sm font-bold rounded-2xl flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl ${
                              (Array.from(unsavedChanges).some(key => key.startsWith(`${phaseAlloc.id}-`)) || unsavedDescriptions.has(phaseAlloc.id)) && !saving
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 transform hover:scale-105'
                                : 'bg-gray-200 dark:bg-gray-800 text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            <div className="p-1 rounded-full bg-white/20 dark:bg-white/10">
                              <FaSave className="w-4 h-4" />
                            </div>
                            {saving ? 'Submitting...' : 'Request Approval'}
                          </button>
                        </div>
                            </div>
                          ) : (
                            /* Show existing planning (read-only) with pending/rejected message */
                            <div>
                              {/* Pending/Rejected Allocation Message */}
                              <div className="text-center py-6 mb-6">
                                {phaseAlloc.approvalStatus === 'PENDING' && (
                                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                                    <div className="flex items-center justify-center mb-4">
                                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                        <span className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></span>
                                      </div>
                                    </div>
                                    <h3 className="text-lg font-medium text-orange-900 mb-2">
                                      Allocation Pending Approval
                                    </h3>
                                    <p className="text-orange-700 text-sm mb-4">
                                      This phase allocation is waiting for Growth Team approval. Your previous weekly planning is preserved below.
                                    </p>
                                    <div className="text-orange-600 text-sm">
                                      <strong>{formatHours(phaseAlloc.totalHours)}</strong> allocated • Waiting for approval
                                    </div>
                                  </div>
                                )}

                                {phaseAlloc.approvalStatus === 'REJECTED' && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                    <div className="flex items-center justify-center mb-4">
                                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                        <FaTimes className="w-4 h-4 text-red-500" />
                                      </div>
                                    </div>
                                    <h3 className="text-lg font-medium text-red-900 mb-2">
                                      Allocation Rejected
                                    </h3>
                                    <p className="text-red-700 text-sm mb-4">
                                      This phase allocation was rejected by the Growth Team. Please contact your Product Manager for more information.
                                    </p>
                                    <div className="text-red-600 text-sm">
                                      <strong>{formatHours(phaseAlloc.totalHours)}</strong> was requested • Rejected
                                    </div>
                                  </div>
                                )}

                                {/* Show existing planned hours (read-only) */}
                                {phaseAlloc.weeklyAllocations.length > 0 && (
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                                    <h4 className="text-sm font-medium text-foreground mb-3">Your Previous Planning</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {phaseAlloc.weeklyAllocations.map((weeklyAlloc: any) => {
                                        const weekStart = new Date(weeklyAlloc.weekStartDate);
                                        const weekLabel = `${formatDate(weekStart)} - ${formatDate(new Date(weeklyAlloc.weekEndDate))}`;
                                        const hours = weeklyAlloc.approvedHours || weeklyAlloc.proposedHours || 0;

                                        return hours > 0 ? (
                                          <div key={weeklyAlloc.id} className="bg-white border border-gray-300 rounded-lg p-3">
                                            <div className="text-xs font-medium text-gray-600 mb-1">{weekLabel}</div>
                                            <div className="text-lg font-semibold text-blue-600">{formatHours(hours)}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {weeklyAlloc.planningStatus === 'APPROVED' ? 'Approved' :
                                               weeklyAlloc.planningStatus === 'PENDING' ? 'Pending' : 'Planned'}
                                            </div>
                                          </div>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>

        <InstructionsPanel />
        </div>
    </div>
  );
}