'use client';

import { useState } from 'react';
import { FaCheck, FaTimes, FaEdit, FaUser, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, FaCheckCircle } from 'react-icons/fa';
import { formatHoursForApproval } from '@/lib/dates';
import { generateColorFromString } from '@/lib/colors';

interface WeeklyAllocation {
  id: string;
  proposedHours: number;
  weekNumber: number;
  year: number;
  weekStartDate: Date;
  weekEndDate: Date;
  createdAt?: Date;
  consultantId: string;
  consultant: {
    id: string;
    name: string;
    email: string;
  };
  phaseAllocation: {
    id: string;
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
        name: string;
        email: string;
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
  onBatchApproval: (weekKey: string, action: 'approve' | 'reject') => Promise<void>;
  processingIds: Set<string>;
}

export default function WeeklyPlanApproval({
  weeklyAllocations,
  onApproval,
  onBatchApproval,
  processingIds
}: WeeklyPlanApprovalProps) {
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
        (allocation.proposedHours >= weeklyFilterBy.hoursRange.min &&
         allocation.proposedHours <= weeklyFilterBy.hoursRange.max);

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
          return b.proposedHours - a.proposedHours;
        case 'hours-low':
          return a.proposedHours - b.proposedHours;
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
      // Create a group key based on consultant and submission time (rounded to nearest minute)
      const submissionTime = new Date(allocation.createdAt || allocation.weekStartDate);
      const roundedTime = Math.floor(submissionTime.getTime() / (1000 * 60)) * (1000 * 60); // Round to minute
      const groupKey = `${allocation.consultant.id}-${roundedTime}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, []);
      }
      grouped.get(groupKey)!.push(allocation);
    });

    // Convert to array and sort groups by most recent submission
    return Array.from(grouped.entries())
      .map(([key, allocations]) => {
        return {
          id: key,
          consultant: allocations[0].consultant,
          submissionTime: new Date(allocations[0].createdAt || allocations[0].weekStartDate),
          allocations: allocations.sort((a, b) => new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime()),
          totalHours: allocations.reduce((sum, alloc) => sum + alloc.proposedHours, 0)
        };
      })
      .sort((a, b) => b.submissionTime.getTime() - a.submissionTime.getTime());
  };

  // Get unique consultants and projects for weekly filter dropdowns
  const getWeeklyFilterOptions = () => {
    const consultants = Array.from(new Set(weeklyAllocations.raw.map(a => a.consultant.name || a.consultant.email))).filter(Boolean);
    const projects = Array.from(new Set(weeklyAllocations.raw.map(a => a.phaseAllocation.phase.project.title))).filter(Boolean);
    return { consultants, projects };
  };
  const { consultants: weeklyAvailableConsultants, projects: weeklyAvailableProjects } = getWeeklyFilterOptions();

  return (
    <div className="space-y-8">
      {/* Search and Filter Controls */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl shadow-lg border border-gray-200/60 overflow-hidden">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FaFilter className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
                <p className="text-sm text-gray-500">Find specific weekly plans quickly</p>
              </div>
            </div>
            <button
              onClick={() => {
                setWeeklySearchTerm('');
                setWeeklyFilterBy({ consultant: '', project: '', hoursRange: null, timeRange: 'all' });
                setWeeklySortBy('newest');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <FaTimes className="w-3 h-3" />
              Clear All
            </button>
          </div>
        </div>

        {/* Search and Sort Section */}
        <div className="px-6 py-5 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Plans
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by consultant, project, or phase..."
                  value={weeklySearchTerm}
                  onChange={(e) => setWeeklySearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                />
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <div className="relative">
                <select
                  value={weeklySortBy}
                  onChange={(e) => setWeeklySortBy(e.target.value as any)}
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
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
                    <FaSortAmountDown className="h-3 w-3 text-gray-400" />
                  ) : (
                    <FaSortAmountUp className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Time Range Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={weeklyFilterBy.timeRange}
                onChange={(e) => setWeeklyFilterBy(prev => ({ ...prev, timeRange: e.target.value as any }))}
                className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
              >
                <option value="all">All Weeks</option>
                <option value="this-week">This Week</option>
                <option value="next-week">Next Week</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters Section */}
        <div className="px-6 py-5 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Consultant Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Consultant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={weeklyFilterBy.consultant}
                  onChange={(e) => setWeeklyFilterBy(prev => ({ ...prev, consultant: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaCheckCircle className="h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={weeklyFilterBy.project}
                  onChange={(e) => setWeeklyFilterBy(prev => ({ ...prev, project: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
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
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                <span className="text-blue-600 font-bold">{getFilteredAndSortedWeeklyAllocations().length}</span>
                <span className="text-gray-500 mx-1">of</span>
                <span className="font-bold">{weeklyAllocations.raw.length}</span>
                <span className="text-gray-600 ml-1">
                  request{weeklyAllocations.raw.length !== 1 ? 's' : ''} shown
                </span>
              </p>
            </div>
            {(weeklySearchTerm || weeklyFilterBy.consultant || weeklyFilterBy.project || weeklyFilterBy.hoursRange || weeklyFilterBy.timeRange !== 'all') && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
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
          <div className="w-full border-t-2 border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-6 py-2 text-sm font-medium text-gray-500 rounded-full border border-gray-200">
            Weekly Plan Requests
          </span>
        </div>
      </div>

      {getFilteredAndSortedWeeklyAllocations().length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {weeklyAllocations.raw.length === 0 ? (
            <>
              <FaCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
              <p className="text-gray-600">No weekly plans pending approval.</p>
            </>
          ) : (
            <>
              <FaSearch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No results found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {getGroupedWeeklyAllocations().map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              {/* Group Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${generateColorFromString(group.consultant.id)}`}>
                      {group.consultant.name || group.consultant.email}
                    </span>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{group.allocations.length} week{group.allocations.length !== 1 ? 's' : ''}</span>
                      <span className="mx-2">•</span>
                      <span className="font-medium">{formatHoursForApproval(group.totalHours)} total</span>
                      <span className="mx-2">•</span>
                      <span>Submitted {group.submissionTime.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        group.allocations.forEach(allocation => {
                          onApproval(allocation.id, 'approve', { approvedHours: allocation.proposedHours });
                        });
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
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
                  {group.allocations.map((allocation) => (
                    <div key={allocation.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm text-gray-900 font-medium">
                                <span className="font-bold">{allocation.phaseAllocation.phase.project.title}</span> • {allocation.phaseAllocation.phase.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Week of {new Date(allocation.weekStartDate).toLocaleDateString()} - {new Date(allocation.weekEndDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-xl font-bold text-blue-600">
                                {formatHoursForApproval(allocation.proposedHours)}
                              </div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                                Hours
                              </div>

                              {/* Action Buttons - positioned beneath hours */}
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => {
                                    const reason = prompt('Enter rejection reason:');
                                    if (reason) {
                                      onApproval(allocation.id, 'reject', { rejectionReason: reason });
                                    }
                                  }}
                                  disabled={processingIds.has(allocation.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <FaTimes className="w-2.5 h-2.5" />
                                  Reject
                                </button>

                                <button
                                  onClick={() => {
                                    const approvedHours = prompt('Enter approved hours:', allocation.proposedHours.toString());
                                    if (approvedHours && parseFloat(approvedHours) >= 0) {
                                      onApproval(allocation.id, 'modify', { approvedHours: parseFloat(approvedHours) });
                                    }
                                  }}
                                  disabled={processingIds.has(allocation.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <FaEdit className="w-2.5 h-2.5" />
                                  Modify
                                </button>

                                <button
                                  onClick={() => onApproval(allocation.id, 'approve', { approvedHours: allocation.proposedHours })}
                                  disabled={processingIds.has(allocation.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <FaCheck className="w-2.5 h-2.5" />
                                  Approve
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Week Workload Context */}
                          {(() => {
                            const weekKey = allocation.weekStartDate.toISOString().split('T')[0];
                            const workloadContext = getWeekWorkloadContext(allocation.consultantId, weekKey);
                            return (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-start gap-2">
                                  <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div>
                                  <div className="flex-1 min-w-0">
                                    {workloadContext.totalApprovedHours > 0 ? (
                                      <>
                                        <h5 className="text-xs font-medium text-blue-800 mb-1">
                                          Other work this week: {formatHoursForApproval(workloadContext.totalApprovedHours)} approved
                                        </h5>
                                        <div className="space-y-0.5">
                                          {workloadContext.projects.map((project, index) => (
                                            <div key={index} className="flex items-center justify-between text-xs text-blue-600">
                                              <span className="truncate">
                                                <span className="font-medium">{project.projectTitle}</span>
                                                <span className="text-blue-500 mx-1">•</span>
                                                <span>{project.phaseName}</span>
                                              </span>
                                              <span className="font-medium ml-2 flex-shrink-0">
                                                {formatHoursForApproval(project.hours)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="mt-1 text-xs text-blue-700">
                                          Week total if approved: <span className="font-bold">
                                            {formatHoursForApproval(workloadContext.totalApprovedHours + allocation.proposedHours)}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <h5 className="text-xs font-medium text-gray-500 mb-0.5">
                                          Other work this week: None
                                        </h5>
                                        <div className="text-xs text-gray-400">
                                          No other approved allocations for this week
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}