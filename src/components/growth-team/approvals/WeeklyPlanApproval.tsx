'use client';

import { useState } from 'react';
import { FaCheck, FaTimes, FaEdit, FaUser, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, FaCheckCircle } from 'react-icons/fa';
import { formatHoursForApproval, formatDate } from '@/lib/dates';
import { generateColorFromString } from '@/lib/colors';
import RejectionReasonModal from './RejectionReasonModal';
import ModifyHoursModal from './ModifyHoursModal';

interface WeeklyAllocation {
  id: string;
  proposedHours: number | null;
  weekNumber: number;
  year: number;
  weekStartDate: Date;
  weekEndDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
  consultantId: string;
  consultant: {
    id: string;
    name: string | null;
    email: string | null;
  };
  phaseAllocation: {
    id: string;
    totalHours: number;
    phase: {
      id: string;
      name: string;
      project: {
        id: string;
        title: string;
      };
    };
  };
}

interface GroupedWeeklyAllocations {
  [weekKey: string]: {
    [consultantId: string]: {
      consultant: {
        id: string;
        name: string | null;
        email: string | null;
      };
      totalProposed: number;
      allocations: WeeklyAllocation[];
      weeklyWorkload: {
        totalApprovedHours: number;
        projects: Array<{
          projectTitle: string;
          phaseName: string;
          hours: number;
        }>;
      };
    };
  };
}

interface WeeklyPlanApprovalProps {
  weeklyAllocations: {
    grouped: GroupedWeeklyAllocations;
    raw: WeeklyAllocation[];
  };
  onApproval: (allocationId: string, action: 'approve' | 'reject' | 'modify', data?: any) => Promise<void>;
  onBatchApproval: (allocationIds: string[]) => Promise<void>;
  processingIds: Set<string>;
}

export default function WeeklyPlanApproval({
  weeklyAllocations,
  onApproval,
  onBatchApproval,
  processingIds
}: WeeklyPlanApprovalProps) {
  // Helper function to format date with time
  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    const dateStr = formatDate(d);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${dateStr} at ${hours}:${minutes}`;
  };

  // Weekly plan approvals state for search and filtering
  const [weeklySearchTerm, setWeeklySearchTerm] = useState('');
  const [weeklySortBy, setWeeklySortBy] = useState<'newest' | 'oldest' | 'hours-high' | 'hours-low' | 'consultant' | 'project'>('newest');
  const [weeklyFilterBy, setWeeklyFilterBy] = useState<{
    consultant: string;
    project: string;
    hoursRange: { min: number; max: number } | null;
    timeRange: 'all' | 'this-week' | 'next-week';
  }>({
    consultant: '',
    project: '',
    hoursRange: null,
    timeRange: 'all'
  });

  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionAllocationId, setRejectionAllocationId] = useState<string | null>(null);
  const [rejectionAllocationName, setRejectionAllocationName] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Modify modal state
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [modifyAllocationId, setModifyAllocationId] = useState<string | null>(null);
  const [modifyAllocationName, setModifyAllocationName] = useState('');
  const [modifyOriginalHours, setModifyOriginalHours] = useState(0);
  const [modifyMaxHours, setModifyMaxHours] = useState<number | undefined>(undefined);
  const [isSubmittingModify, setIsSubmittingModify] = useState(false);

  // Filter and sort weekly allocations
  const getFilteredAndSortedWeeklyAllocations = () => {
    let filtered = weeklyAllocations.raw.filter(allocation => {
      const consultant = allocation.consultant;
      const project = allocation.phaseAllocation.phase.project;
      const phase = allocation.phaseAllocation.phase;
      const consultantName = consultant.name || consultant.email || '';
      const projectName = project.title;
      const phaseName = phase.name;

      // Search filter
      const searchMatch = weeklySearchTerm === '' ||
        consultantName.toLowerCase().includes(weeklySearchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(weeklySearchTerm.toLowerCase()) ||
        phaseName.toLowerCase().includes(weeklySearchTerm.toLowerCase());

      // Consultant filter
      const consultantMatch = weeklyFilterBy.consultant === '' ||
        consultantName.toLowerCase().includes(weeklyFilterBy.consultant.toLowerCase());

      // Project filter
      const projectMatch = weeklyFilterBy.project === '' ||
        projectName.toLowerCase().includes(weeklyFilterBy.project.toLowerCase());

      // Hours range filter
      const hoursMatch = !weeklyFilterBy.hoursRange ||
        ((allocation.proposedHours || 0) >= weeklyFilterBy.hoursRange.min &&
         (allocation.proposedHours || 0) <= weeklyFilterBy.hoursRange.max);

      // Time range filter
      let timeMatch = true;
      if (weeklyFilterBy.timeRange !== 'all') {
        const allocationWeek = new Date(allocation.weekStartDate);
        allocationWeek.setHours(0, 0, 0, 0);

        if (weeklyFilterBy.timeRange === 'this-week') {
          const thisWeekStart = new Date();
          thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay() + 1);
          thisWeekStart.setHours(0, 0, 0, 0);
          timeMatch = allocationWeek.getTime() === thisWeekStart.getTime();
        } else if (weeklyFilterBy.timeRange === 'next-week') {
          const nextWeekStart = new Date();
          nextWeekStart.setDate(nextWeekStart.getDate() - nextWeekStart.getDay() + 8);
          nextWeekStart.setHours(0, 0, 0, 0);
          timeMatch = allocationWeek.getTime() === nextWeekStart.getTime();
        }
      }

      return searchMatch && consultantMatch && projectMatch && hoursMatch && timeMatch;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (weeklySortBy) {
        case 'newest':
          return new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime();
        case 'oldest':
          return new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime();
        case 'hours-high':
          return (b.proposedHours || 0) - (a.proposedHours || 0);
        case 'hours-low':
          return (a.proposedHours || 0) - (b.proposedHours || 0);
        case 'consultant':
          return (a.consultant.name || a.consultant.email || '').localeCompare(b.consultant.name || b.consultant.email || '');
        case 'project':
          return a.phaseAllocation.phase.project.title.localeCompare(b.phaseAllocation.phase.project.title);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Get workload context for a specific consultant and week
  const getWeekWorkloadContext = (consultantId: string, weekKey: string) => {
    const weekData = weeklyAllocations.grouped[weekKey];
    if (weekData && weekData[consultantId] && weekData[consultantId].weeklyWorkload) {
      return weekData[consultantId].weeklyWorkload;
    }
    return { totalApprovedHours: 0, projects: [] };
  };

  const getGroupedWeeklyAllocations = () => {
    const filtered = getFilteredAndSortedWeeklyAllocations();
    const grouped = new Map<string, typeof filtered>();

    filtered.forEach(allocation => {
      // Create a group key based on consultant and most recent update time (rounded to nearest minute)
      // Use updatedAt to reflect modifications, fall back to createdAt or weekStartDate
      const submissionTime = new Date(allocation.updatedAt || allocation.createdAt || allocation.weekStartDate);
      const roundedTime = Math.floor(submissionTime.getTime() / (1000 * 60)) * (1000 * 60); // Round to minute
      const groupKey = `${allocation.consultant.id}-${roundedTime}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(allocation);
    });

    // Convert to array and sort groups based on selected sort option
    const groups = Array.from(grouped.entries())
      .map(([key, allocations]) => {
        return {
          id: key,
          consultant: allocations[0].consultant,
          submissionTime: new Date(allocations[0].updatedAt || allocations[0].createdAt || allocations[0].weekStartDate),
          allocations: allocations.sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime()),
          totalHours: allocations.reduce((sum, alloc) => sum + (alloc.proposedHours || 0), 0),
          earliestWeek: new Date(Math.min(...allocations.map(a => new Date(a.weekStartDate).getTime()))),
          projectTitle: allocations[0].phaseAllocation.phase.project.title
        };
      });

    // Sort groups based on user selection (default: most recent submissions first)
    groups.sort((a, b) => {
      switch (weeklySortBy) {
        case 'newest':
          return b.submissionTime.getTime() - a.submissionTime.getTime();
        case 'oldest':
          return a.submissionTime.getTime() - b.submissionTime.getTime();
        case 'hours-high':
          return b.totalHours - a.totalHours;
        case 'hours-low':
          return a.totalHours - b.totalHours;
        case 'consultant':
          return (a.consultant.name || a.consultant.email || '').localeCompare(b.consultant.name || b.consultant.email || '');
        case 'project':
          return a.projectTitle.localeCompare(b.projectTitle);
        default:
          return b.submissionTime.getTime() - a.submissionTime.getTime();
      }
    });

    return groups;
  };

  // Get unique consultants and projects for weekly filter dropdowns
  const getWeeklyFilterOptions = () => {
    const consultants = Array.from(new Set(weeklyAllocations.raw.map(a => a.consultant.name || a.consultant.email || 'Unknown'))).filter(Boolean);
    const projects = Array.from(new Set(weeklyAllocations.raw.map(a => a.phaseAllocation.phase.project.title))).filter(Boolean);
    return { consultants, projects };
  };
  const { consultants: weeklyAvailableConsultants, projects: weeklyAvailableProjects } = getWeeklyFilterOptions();

  // Handle rejection modal submission
  const handleRejectionSubmit = async (reason: string) => {
    if (!rejectionAllocationId) return;

    setIsSubmittingRejection(true);
    try {
      await onApproval(rejectionAllocationId, 'reject', { rejectionReason: reason });
      setRejectionModalOpen(false);
      setRejectionAllocationId(null);
      setRejectionAllocationName('');
    } catch (error) {
      console.error('Failed to reject weekly allocation:', error);
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Open rejection modal
  const openRejectionModal = (allocation: WeeklyAllocation) => {
    const consultantName = allocation.consultant.name || allocation.consultant.email || 'this consultant';
    const weekRange = `${formatDate(new Date(allocation.weekStartDate))} - ${formatDate(new Date(allocation.weekEndDate))}`;
    const itemName = `${consultantName}'s ${formatHoursForApproval(allocation.proposedHours || 0)} for ${allocation.phaseAllocation.phase.name} (week of ${weekRange})`;
    setRejectionAllocationId(allocation.id);
    setRejectionAllocationName(itemName);
    setRejectionModalOpen(true);
  };

  // Open modify modal
  const openModifyModal = (allocation: WeeklyAllocation) => {
    const consultantName = allocation.consultant.name || allocation.consultant.email || 'this consultant';
    const weekRange = `${formatDate(new Date(allocation.weekStartDate))} - ${formatDate(new Date(allocation.weekEndDate))}`;
    const itemName = `${consultantName} • ${allocation.phaseAllocation.phase.project.title} • ${allocation.phaseAllocation.phase.name} • Week of ${weekRange}`;

    // Calculate how many hours are already allocated to other weeks for this phase allocation
    const otherWeeksTotal = weeklyAllocations.raw
      .filter(a =>
        a.phaseAllocation.id === allocation.phaseAllocation.id &&
        a.id !== allocation.id // Exclude current week
      )
      .reduce((sum, a) => sum + (a.proposedHours || 0), 0);

    // Maximum hours for this week = total phase allocation - hours in other weeks
    const maxHoursForThisWeek = allocation.phaseAllocation.totalHours - otherWeeksTotal;

    setModifyAllocationId(allocation.id);
    setModifyAllocationName(itemName);
    setModifyOriginalHours(allocation.proposedHours || 0);
    setModifyMaxHours(maxHoursForThisWeek);
    setModifyModalOpen(true);
  };

  // Handle modify modal submission
  const handleModifySubmit = async (approvedHours: number) => {
    if (!modifyAllocationId) return;

    setIsSubmittingModify(true);
    try {
      await onApproval(modifyAllocationId, 'modify', { approvedHours });
      setModifyModalOpen(false);
      setModifyAllocationId(null);
      setModifyAllocationName('');
      setModifyOriginalHours(0);
      setModifyMaxHours(undefined);
    } catch (error) {
      console.error('Failed to modify weekly allocation:', error);
    } finally {
      setIsSubmittingModify(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search and Filter Controls */}
      <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/60 overflow-hidden">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center">
                <FaFilter className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Search & Filter</h3>
                <p className="text-sm text-muted-foreground">Find specific weekly plans quickly</p>
              </div>
            </div>
            <button
              onClick={() => {
                setWeeklySearchTerm('');
                setWeeklyFilterBy({ consultant: '', project: '', hoursRange: null, timeRange: 'all' });
                setWeeklySortBy('newest');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-card-foreground bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <FaTimes className="w-3 h-3" />
              Clear All
            </button>
          </div>
        </div>

        {/* Search and Sort Section */}
        <div className="px-6 py-5 bg-white dark:bg-gray-800">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Search Plans
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Search by consultant, project, or phase..."
                  value={weeklySearchTerm}
                  onChange={(e) => setWeeklySearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Sort By
              </label>
              <div className="relative">
                <select
                  value={weeklySortBy}
                  onChange={(e) => setWeeklySortBy(e.target.value as any)}
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 appearance-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="hours-high">Highest Hours</option>
                  <option value="hours-low">Lowest Hours</option>
                  <option value="consultant">Consultant A-Z</option>
                  <option value="project">Project A-Z</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  {weeklySortBy.includes('high') || weeklySortBy === 'newest' ? (
                    <FaSortAmountDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <FaSortAmountUp className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Time Range Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Time Range
              </label>
              <select
                value={weeklyFilterBy.timeRange}
                onChange={(e) => setWeeklyFilterBy(prev => ({ ...prev, timeRange: e.target.value as any }))}
                className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 appearance-none"
              >
                <option value="all">All Weeks</option>
                <option value="this-week">This Week</option>
                <option value="next-week">Next Week</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters Section */}
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Consultant Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Consultant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-4 w-4 text-muted-foreground" />
                </div>
                <select
                  value={weeklyFilterBy.consultant}
                  onChange={(e) => setWeeklyFilterBy(prev => ({ ...prev, consultant: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 appearance-none"
                >
                  <option value="">All Consultants</option>
                  {weeklyAvailableConsultants.map(consultant => (
                    <option key={consultant} value={consultant}>{consultant}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Project
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <select
                  value={weeklyFilterBy.project}
                  onChange={(e) => setWeeklyFilterBy(prev => ({ ...prev, project: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 appearance-none"
                >
                  <option value="">All Projects</option>
                  {weeklyAvailableProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hours Range Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Hours Range
              </label>
              <select
                value={weeklyFilterBy.hoursRange ? `${weeklyFilterBy.hoursRange.min}-${weeklyFilterBy.hoursRange.max}` : ''}
                onChange={(e) => {
                  if (e.target.value === '') {
                    setWeeklyFilterBy(prev => ({ ...prev, hoursRange: null }));
                  } else {
                    const [min, max] = e.target.value.split('-').map(Number);
                    setWeeklyFilterBy(prev => ({ ...prev, hoursRange: { min, max } }));
                  }
                }}
                className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 appearance-none"
              >
                <option value="">All Hours</option>
                <option value="0-10">0-10 hours</option>
                <option value="10-20">10-20 hours</option>
                <option value="20-40">20-40 hours</option>
                <option value="40-80">40-80 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{getFilteredAndSortedWeeklyAllocations().length}</span>
                <span className="text-muted-foreground mx-1">of</span>
                <span className="font-bold">{weeklyAllocations.raw.length}</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">
                  request{weeklyAllocations.raw.length !== 1 ? 's' : ''} shown
                </span>
              </p>
            </div>
            {(weeklySearchTerm || weeklyFilterBy.consultant || weeklyFilterBy.project || weeklyFilterBy.hoursRange || weeklyFilterBy.timeRange !== 'all') && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-amber-400 dark:bg-amber-500 rounded-full"></div>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Filtered
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 dark:bg-gray-900 px-6 py-2 text-sm font-medium text-muted-foreground rounded-full border border-gray-200 dark:border-gray-700">
            Weekly Plan Requests
          </span>
        </div>
      </div>

      {getFilteredAndSortedWeeklyAllocations().length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
          {weeklyAllocations.raw.length === 0 ? (
            <>
              <FaCheck className="h-12 w-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
              <p className="text-gray-600 dark:text-gray-400">No weekly plans pending approval.</p>
            </>
          ) : (
            <>
              <FaSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No results found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {getGroupedWeeklyAllocations().map((group) => (
            <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              {/* Group Header */}
              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${generateColorFromString(group.consultant.id)}`}>
                      {group.consultant.name || group.consultant.email}
                    </span>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{group.allocations.length} week{group.allocations.length !== 1 ? 's' : ''}</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium">{formatHoursForApproval(group.totalHours)} total</span>
                      <span className="mx-2">•</span>
                      <span>Submitted {formatDateTime(group.submissionTime)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const allocationIds = group.allocations.map(a => a.id);
                        onBatchApproval(allocationIds);
                      }}
                      disabled={group.allocations.some(a => processingIds.has(a.id))}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-700 border border-transparent rounded-md hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      <FaCheck className="w-3 h-3" />
                      Approve All
                    </button>
                  </div>
                </div>
              </div>


              {/* Individual Weekly Allocations */}
              <div className="p-6">
                <div className="space-y-4">
                  {group.allocations.map((allocation) => {
                    // Format week label like "Week Oct 6"
                    const weekStartDate = new Date(allocation.weekStartDate);
                    const weekLabel = `Week ${weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

                    return (
                    <div key={allocation.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              {/* Week Label - Prominent */}
                              <div className="mb-2">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                  {weekLabel}
                                </span>
                              </div>

                              {/* Project and Phase - Larger and more readable */}
                              <h4 className="text-base font-bold text-foreground mb-1">
                                {allocation.phaseAllocation.phase.project.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {allocation.phaseAllocation.phase.name}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {formatHoursForApproval(allocation.proposedHours || 0)}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                                Hours
                              </div>

                              {/* Action Buttons - positioned beneath hours */}
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => openRejectionModal(allocation)}
                                  disabled={processingIds.has(allocation.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <FaTimes className="w-2.5 h-2.5" />
                                  Reject
                                </button>

                                <button
                                  onClick={() => openModifyModal(allocation)}
                                  disabled={processingIds.has(allocation.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <FaEdit className="w-2.5 h-2.5" />
                                  Modify
                                </button>

                                <button
                                  onClick={() => onApproval(allocation.id, 'approve', { approvedHours: allocation.proposedHours || 0 })}
                                  disabled={processingIds.has(allocation.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 dark:bg-green-700 border border-transparent rounded hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <FaCheck className="w-2.5 h-2.5" />
                                  Approve
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Week Workload Context - Compact */}
                          {(() => {
                            const weekKey = new Date(allocation.weekStartDate).toISOString().split('T')[0];
                            const workloadContext = getWeekWorkloadContext(allocation.consultantId, weekKey);

                            return (
                              <div className="mt-3">
                                {workloadContext.totalApprovedHours > 0 ? (
                                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-l-3 border-indigo-400 dark:border-indigo-600 rounded-r-lg px-3 py-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
                                          Other Work This Week
                                        </h5>
                                      </div>
                                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
                                        {formatHoursForApproval(workloadContext.totalApprovedHours)} approved
                                      </span>
                                    </div>
                                    <div className="space-y-1 mb-2">
                                      {workloadContext.projects.map((project, index) => (
                                        <div key={index} className="flex items-center justify-between text-xs">
                                          <span className="text-indigo-700 dark:text-indigo-300 truncate mr-2">
                                            <span className="font-semibold">{project.projectTitle}</span>
                                            <span className="text-indigo-500 dark:text-indigo-500 mx-1">•</span>
                                            <span>{project.phaseName}</span>
                                          </span>
                                          <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                            {formatHoursForApproval(project.hours)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                                      <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                                        Week Total (if approved):
                                      </span>
                                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                                        {formatHoursForApproval(workloadContext.totalApprovedHours + (allocation.proposedHours || 0))}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-gray-50 dark:bg-gray-900/50 border-l-3 border-gray-300 dark:border-gray-600 rounded-r-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                      </svg>
                                      <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                        Other Work This Week:
                                      </h5>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">None</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        isOpen={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setRejectionAllocationId(null);
          setRejectionAllocationName('');
        }}
        onSubmit={handleRejectionSubmit}
        title="Reject Weekly Plan"
        itemName={rejectionAllocationName}
        isSubmitting={isSubmittingRejection}
      />

      {/* Modify Hours Modal */}
      <ModifyHoursModal
        isOpen={modifyModalOpen}
        onClose={() => {
          setModifyModalOpen(false);
          setModifyAllocationId(null);
          setModifyAllocationName('');
          setModifyOriginalHours(0);
          setModifyMaxHours(undefined);
        }}
        onSubmit={handleModifySubmit}
        title="Modify Weekly Hours"
        itemName={modifyAllocationName}
        originalHours={modifyOriginalHours}
        maxHours={modifyMaxHours}
        isSubmitting={isSubmittingModify}
      />
    </div>
  );
}