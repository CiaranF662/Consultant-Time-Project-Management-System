'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCalendarAlt, FaChartBar } from 'react-icons/fa';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  year: number;
  totalHours: number;
  availableHours: number;
  status: 'available' | 'partially-busy' | 'busy' | 'overloaded';
  projects: Array<{
    projectId: string;
    projectTitle: string;
    hours: number;
  }>;
}

interface ConsultantAvailability {
  consultant: {
    id: string;
    name: string | null;
    email: string | null;
  };
  allocatedHours: number;
  overallStatus: 'available' | 'partially-busy' | 'busy' | 'overloaded';
  averageHoursPerWeek: number;
  totalAllocatedHours: number;
  weeklyBreakdown: WeekData[];
}

interface ConsultantScheduleViewProps {
  phaseId?: string;
  sprintIds?: string[];
  projectId?: string;
  selectedConsultantIds?: string[];
  startDate?: string;
  endDate?: string;
}

export default function ConsultantScheduleView({
  phaseId,
  sprintIds,
  projectId,
  selectedConsultantIds = [],
  startDate,
  endDate
}: ConsultantScheduleViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [availability, setAvailability] = useState<ConsultantAvailability[]>([]);
  const [weeks, setWeeks] = useState<Array<{ weekStart: Date; weekEnd: Date; weekNumber: number; year: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);

  useEffect(() => {
    if (phaseId || (sprintIds && sprintIds.length > 0) || (startDate && endDate)) {
      fetchAvailability();
    }
  }, [phaseId, sprintIds?.join(','), startDate, endDate]);

  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let response;
      if (phaseId) {
        // Use phase-based endpoint for existing phases
        response = await axios.get(`/api/phases/${phaseId}/consultant-availability`);
      } else if (startDate && endDate) {
        // Use date-based endpoint with direct dates (for project creation)
        response = await axios.get(`/api/consultants/availability`, {
          params: {
            startDate,
            endDate,
            projectId
          }
        });
      } else if (sprintIds && sprintIds.length > 0 && projectId) {
        // Use date-based endpoint for phase creation - need to get sprint dates first
        const sprintsResponse = await axios.get(`/api/projects/${projectId}`);
        const selectedSprints = sprintsResponse.data.sprints.filter((s: any) =>
          sprintIds.includes(s.id)
        );

        if (selectedSprints.length === 0) {
          setError('No sprints selected');
          setIsLoading(false);
          return;
        }

        // Get date range from selected sprints
        const sortedSprints = selectedSprints.sort((a: any, b: any) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
        const startDate = sortedSprints[0].startDate;
        const endDate = sortedSprints[sortedSprints.length - 1].endDate;

        response = await axios.get(`/api/consultants/availability`, {
          params: {
            startDate,
            endDate,
            projectId
          }
        });
      } else {
        setError('Either phaseId or sprintIds must be provided');
        setIsLoading(false);
        return;
      }

      setAvailability(response.data.consultants);
      setWeeks(response.data.weeks.map((w: any) => ({
        ...w,
        weekStart: new Date(w.weekStart),
        weekEnd: new Date(w.weekEnd)
      })));
    } catch (err) {
      setError('Failed to load consultant availability');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'partially-busy':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'busy':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700';
      case 'overloaded':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'partially-busy':
        return 'Partially Busy';
      case 'busy':
        return 'Busy';
      case 'overloaded':
        return 'Overloaded';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner
        size="md"
        message="Loading consultant schedules..."
        centered
      />
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-300">
        {error}
      </div>
    );
  }

  // Filter to show only selected consultants if any are selected
  // Preserve the order of selectedConsultantIds (which is already sorted in PhaseAllocationForm)
  const filteredAvailability = selectedConsultantIds.length > 0
    ? selectedConsultantIds
        .map(id => availability.find(a => a.consultant.id === id))
        .filter((a): a is ConsultantAvailability => a !== undefined)
    : availability;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FaCalendarAlt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-foreground">Consultant Workload During Phase</h3>
      </div>

      {filteredAvailability.map((consultant) => {
        // Calculate total available hours across all weeks
        const totalAvailableHours = consultant.weeklyBreakdown.reduce(
          (sum, week) => sum + week.availableHours,
          0
        );

        return (
          <div
            key={consultant.consultant.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Consultant Header */}
            <button
              type="button"
              onClick={() => setExpandedConsultant(
                expandedConsultant === consultant.consultant.id ? null : consultant.consultant.id
              )}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {consultant.consultant.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">
                    {consultant.consultant.name || consultant.consultant.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(consultant.overallStatus)}`}>
                      {getStatusLabel(consultant.overallStatus)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {consultant.averageHoursPerWeek}h/week avg
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Total: {consultant.totalAllocatedHours}h across {weeks.length} weeks
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Available: {Math.round(totalAvailableHours * 10) / 10}h
                </p>
              </div>
            </button>

          {/* Weekly Breakdown */}
          {expandedConsultant === consultant.consultant.id && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
              <div className="flex items-center gap-2 mb-3">
                <FaChartBar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <h4 className="text-sm font-semibold text-foreground">Week-by-Week Breakdown</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {consultant.weeklyBreakdown.map((week, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    {/* Week Header */}
                    <div className="mb-2">
                      <p className="text-sm font-medium text-foreground">
                        Week {format(new Date(week.weekStart), 'MMM d')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(week.weekStart), 'MMM d')} - {format(new Date(week.weekEnd), 'MMM d')}
                      </p>
                    </div>

                    {/* Hours Summary */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Allocated:</span>
                        <span className="font-semibold text-foreground">{week.totalHours}h</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Available:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{week.availableHours}h</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          week.status === 'available'
                            ? 'bg-green-500'
                            : week.status === 'partially-busy'
                            ? 'bg-yellow-500'
                            : week.status === 'busy'
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (week.totalHours / 40) * 100)}%` }}
                      />
                    </div>

                    {/* Status Badge */}
                    <div className="mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(week.status)}`}>
                        {getStatusLabel(week.status)}
                      </span>
                    </div>

                    {/* Project Breakdown */}
                    {week.projects.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Projects:</p>
                        {week.projects.map((project) => (
                          <div
                            key={project.projectId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground truncate" title={project.projectTitle}>
                              {project.projectTitle}
                            </span>
                            <span className="font-medium text-foreground ml-2 flex-shrink-0">{project.hours}h</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        );
      })}

      {filteredAvailability.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {selectedConsultantIds.length > 0
            ? 'Select consultants to see their workload'
            : 'No consultants available for this phase'}
        </div>
      )}
    </div>
  );
}
