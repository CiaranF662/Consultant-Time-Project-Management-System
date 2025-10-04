'use client';

import { useState } from 'react';
import { FaCheck, FaTimes, FaUser, FaClock, FaSearch, FaFilter, FaSortAmountDown, FaChevronDown, FaChevronUp, FaCalendarWeek } from 'react-icons/fa';
import { formatHours, formatDate } from '@/lib/dates';
import { generateColorFromString } from '@/lib/colors';
import RejectionReasonModal from './RejectionReasonModal';
import ConsultantScheduleView from '@/components/projects/allocations/ConsultantScheduleView';

interface PhaseAllocation {
  id: string;
  totalHours: number;
  createdAt: Date;
  consultant: {
    id: string;
    name: string | null;
    email: string | null;
  };
  phase: {
    id: string;
    name: string;
    description?: string | null;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      title: string;
    };
    sprints: Array<{
      id: string;
      startDate: Date;
      endDate: Date;
    }>;
  };
}

interface PhaseAllocationApprovalProps {
  phaseAllocations: PhaseAllocation[];
  onApproval: (allocationId: string, action: 'approve' | 'reject' | 'modify', data?: any) => Promise<void>;
  processingIds: Set<string>;
}

export default function PhaseAllocationApproval({
  phaseAllocations,
  onApproval,
  processingIds
}: PhaseAllocationApprovalProps) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'consultant' | 'project' | 'hours-high' | 'hours-low'>('newest');
  const [filterBy, setFilterBy] = useState<{
    consultant: string;
    project: string;
    hoursRange: { min: number; max: number } | null;
  }>({
    consultant: '',
    project: '',
    hoursRange: null
  });

  // Rejection modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionAllocationId, setRejectionAllocationId] = useState<string | null>(null);
  const [rejectionAllocationName, setRejectionAllocationName] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Expanded schedule view state
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  // Filter and sort phase allocations
  const getFilteredAndSortedAllocations = () => {
    let filtered = phaseAllocations.filter(allocation => {
      const consultantName = allocation.consultant.name || allocation.consultant.email || '';
      const projectName = allocation.phase.project.title || '';
      const phaseName = allocation.phase.name || '';

      // Search filter
      const searchMatch = searchTerm === '' ||
        consultantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phaseName.toLowerCase().includes(searchTerm.toLowerCase());

      // Consultant filter
      const consultantMatch = filterBy.consultant === '' ||
        consultantName.toLowerCase().includes(filterBy.consultant.toLowerCase());

      // Project filter
      const projectMatch = filterBy.project === '' ||
        projectName.toLowerCase().includes(filterBy.project.toLowerCase());

      // Hours range filter
      const hoursMatch = !filterBy.hoursRange ||
        (allocation.totalHours >= filterBy.hoursRange.min &&
         allocation.totalHours <= filterBy.hoursRange.max);

      return searchMatch && consultantMatch && projectMatch && hoursMatch;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'consultant':
          const nameA = a.consultant.name || a.consultant.email || '';
          const nameB = b.consultant.name || b.consultant.email || '';
          return nameA.localeCompare(nameB);
        case 'project':
          return a.phase.project.title.localeCompare(b.phase.project.title);
        case 'hours-high':
          return b.totalHours - a.totalHours;
        case 'hours-low':
          return a.totalHours - b.totalHours;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Get unique consultants and projects for filter dropdowns
  const getFilterOptions = () => {
    const consultants = Array.from(new Set(phaseAllocations.map(a => a.consultant.name || a.consultant.email || 'Unknown'))).filter(Boolean);
    const projects = Array.from(new Set(phaseAllocations.map(a => a.phase.project.title))).filter(Boolean);
    return { consultants, projects };
  };

  const { consultants: availableConsultants, projects: availableProjects } = getFilterOptions();

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
      console.error('Failed to reject allocation:', error);
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Open rejection modal
  const openRejectionModal = (allocation: PhaseAllocation) => {
    const consultantName = allocation.consultant.name || allocation.consultant.email || 'this consultant';
    const itemName = `${consultantName}'s allocation for ${allocation.phase.name}`;
    setRejectionAllocationId(allocation.id);
    setRejectionAllocationName(itemName);
    setRejectionModalOpen(true);
  };

  // Calculate number of weeks from sprints or date range
  const calculateWeeks = (phase: PhaseAllocation['phase']) => {
    // Try to calculate from sprints first
    if (phase.sprints && phase.sprints.length > 0) {
      // Each sprint is 2 weeks
      return phase.sprints.length * 2;
    }

    // Fallback: calculate from date range
    const start = new Date(phase.startDate);
    const end = new Date(phase.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffDays / 7);
    return weeks;
  };

  // Toggle schedule view
  const toggleScheduleView = (allocationId: string) => {
    setExpandedScheduleId(expandedScheduleId === allocationId ? null : allocationId);
  };

  return (
    <div className="space-y-6">
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
                <h3 className="text-lg font-semibold text-foreground">Search & Filter</h3>
                <p className="text-sm text-muted-foreground">Find specific approvals quickly</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterBy({ consultant: '', project: '', hoursRange: null });
                setSortBy('newest');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-card-foreground bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <FaTimes className="w-3 h-3" />
              Clear All
            </button>
          </div>
        </div>

        {/* Search and Sort Section */}
        <div className="px-6 py-5 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Enhanced Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Search Approvals
              </label>
              <div className="relative group">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by consultant, project, or phase..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Enhanced Sort Dropdown */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Sort By
              </label>
              <div className="relative">
                <FaSortAmountDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="consultant">Consultant A-Z</option>
                  <option value="project">Project A-Z</option>
                  <option value="hours-high">Hours: High to Low</option>
                  <option value="hours-low">Hours: Low to High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters Section */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50/50 to-blue-50/30 border-t border-gray-100">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FaFilter className="w-3 h-3 text-blue-500" />
              Advanced Filters
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Consultant Filter */}
            <div>
              <label className="block text-xs font-semibold text-card-foreground mb-2 uppercase tracking-wide">
                Consultant
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <select
                  value={filterBy.consultant}
                  onChange={(e) => setFilterBy(prev => ({ ...prev, consultant: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
                >
                  <option value="">All Consultants</option>
                  {availableConsultants.map(consultant => (
                    <option key={consultant} value={consultant}>{consultant}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-xs font-semibold text-card-foreground mb-2 uppercase tracking-wide">
                Project
              </label>
              <div className="relative">
                <FaClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <select
                  value={filterBy.project}
                  onChange={(e) => setFilterBy(prev => ({ ...prev, project: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
                >
                  <option value="">All Projects</option>
                  {availableProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hours Range Filter */}
            <div>
              <label className="block text-xs font-semibold text-card-foreground mb-2 uppercase tracking-wide">
                Hours Range
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xs font-bold">
                  H
                </span>
                <select
                  value={filterBy.hoursRange ? `${filterBy.hoursRange.min}-${filterBy.hoursRange.max}` : ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setFilterBy(prev => ({ ...prev, hoursRange: null }));
                    } else {
                      const [min, max] = e.target.value.split('-').map(Number);
                      setFilterBy(prev => ({ ...prev, hoursRange: { min, max } }));
                    }
                  }}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 appearance-none"
                >
                  <option value="">All Hours</option>
                  <option value="0-10">0-10 hours</option>
                  <option value="10-20">10-20 hours</option>
                  <option value="20-40">20-40 hours</option>
                  <option value="40-80">40-80 hours</option>
                  <option value="80-999">80+ hours</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm font-medium text-card-foreground">
                <span className="text-blue-600 font-bold">{getFilteredAndSortedAllocations().length}</span>
                <span className="text-muted-foreground mx-1">of</span>
                <span className="font-bold">{phaseAllocations.length}</span>
                <span className="text-gray-600 ml-1">
                  allocation{phaseAllocations.length !== 1 ? 's' : ''} shown
                </span>
              </p>
            </div>
            {(searchTerm || filterBy.consultant || filterBy.project || filterBy.hoursRange) && (
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
          <span className="bg-gray-50 px-6 py-2 text-sm font-medium text-muted-foreground rounded-full border border-gray-200">
            Phase Allocation Requests
          </span>
        </div>
      </div>

      {getFilteredAndSortedAllocations().length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {phaseAllocations.length === 0 ? (
            <>
              <FaCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
              <p className="text-gray-600">No phase allocations pending approval.</p>
            </>
          ) : (
            <>
              <FaSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No results found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
            </>
          )}
        </div>
      ) : (
        getFilteredAndSortedAllocations().map((allocation) => (
          <div key={allocation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${generateColorFromString(allocation.consultant.id)}`}>
                          {allocation.consultant.name || allocation.consultant.email}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-bold">{allocation.phase.project.title}</span> • {allocation.phase.name}
                      </p>
                      {allocation.phase.description && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {allocation.phase.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          Phase: {formatDate(new Date(allocation.phase.startDate))} - {formatDate(new Date(allocation.phase.endDate))}
                        </p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-xs font-medium">
                          <FaCalendarWeek className="w-3 h-3" />
                          {calculateWeeks(allocation.phase)} weeks
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatHours(allocation.totalHours)}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                        Hours Requested
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openRejectionModal(allocation)}
                          disabled={processingIds.has(allocation.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaTimes className="w-3 h-3" />
                          Reject
                        </button>

                        <button
                          onClick={() => onApproval(allocation.id, 'approve')}
                          disabled={processingIds.has(allocation.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaCheck className="w-3 h-3" />
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>
                      <span className="font-medium">Requested:</span> {formatDate(new Date(allocation.createdAt))}
                    </span>
                  </div>

                  {/* View Consultant Schedule Button */}
                  <div className="mt-4">
                    <button
                      onClick={() => toggleScheduleView(allocation.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <FaCalendarWeek className="w-4 h-4" />
                      {expandedScheduleId === allocation.id ? 'Hide' : 'View'} Consultant Schedule
                      {expandedScheduleId === allocation.id ? (
                        <FaChevronUp className="w-3 h-3" />
                      ) : (
                        <FaChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Expandable Consultant Schedule View */}
                  {expandedScheduleId === allocation.id && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      <ConsultantScheduleView
                        phaseId={allocation.phase.id}
                        selectedConsultantIds={[allocation.consultant.id]}
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ))
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
        title="Reject Phase Allocation"
        itemName={rejectionAllocationName}
        isSubmitting={isSubmittingRejection}
      />
    </div>
  );
}