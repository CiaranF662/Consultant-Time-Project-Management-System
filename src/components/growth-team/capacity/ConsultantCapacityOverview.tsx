'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUsers, FaCheckCircle, FaExclamationTriangle, FaMinus, FaArrowUp, FaArrowDown, FaUsersCog, FaChevronDown, FaChevronUp, FaChartBar, FaSearch } from 'react-icons/fa';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';

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

export default function ConsultantCapacityOverview() {
  const [loading, setLoading] = useState(true);
  const [consultants, setConsultants] = useState<ConsultantAvailability[]>([]);
  const [weeks, setWeeks] = useState(4);
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState({
    available: 0,
    full: 0,
    over: 0,
    utilizationPercentage: 0,
    trend: 'stable' as 'up' | 'down' | 'stable'
  });

  useEffect(() => {
    fetchCapacityData();
  }, [weeks]);

  const fetchCapacityData = async () => {
    try {
      setLoading(true);

      // Get current week start (Monday)
      const now = new Date();
      const currentDay = now.getDay();
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - daysToMonday);
      currentWeekStart.setHours(0, 0, 0, 0);

      // Get specified weeks from now
      const endDate = new Date(currentWeekStart);
      endDate.setDate(currentWeekStart.getDate() + (weeks * 7));

      const response = await axios.get('/api/consultants/availability', {
        params: {
          startDate: currentWeekStart.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      const consultantData = response.data.consultants as ConsultantAvailability[];
      setConsultants(consultantData);

      // Calculate summary stats
      const thisWeekData = consultantData.map(c => ({
        id: c.consultant.id,
        name: c.consultant.name || c.consultant.email || 'Unknown',
        thisWeekHours: c.weeklyBreakdown[0]?.totalHours || 0,
        averageHours: c.averageHoursPerWeek
      }));

      const availableCount = thisWeekData.filter(c => c.thisWeekHours <= 30).length;
      const fullCount = thisWeekData.filter(c => c.thisWeekHours > 30 && c.thisWeekHours <= 40).length;
      const overCount = thisWeekData.filter(c => c.thisWeekHours > 40).length;

      const totalCapacity = consultantData.length * 40 * weeks;
      const totalAllocated = consultantData.reduce((sum, c) => sum + c.totalAllocatedHours, 0);
      const utilizationPercentage = totalCapacity > 0 ? Math.round((totalAllocated / totalCapacity) * 100) : 0;

      // Calculate trend (first half vs second half)
      const halfPoint = Math.floor(weeks / 2);
      const firstHalfAvg = consultantData.reduce((sum, c) => {
        const firstHalf = c.weeklyBreakdown.slice(0, halfPoint).reduce((s, w) => s + w.totalHours, 0);
        return sum + firstHalf;
      }, 0) / halfPoint;

      const lastHalfAvg = consultantData.reduce((sum, c) => {
        const lastHalf = c.weeklyBreakdown.slice(halfPoint).reduce((s, w) => s + w.totalHours, 0);
        return sum + lastHalf;
      }, 0) / (weeks - halfPoint);

      const trend = lastHalfAvg > firstHalfAvg * 1.1 ? 'up' :
                    lastHalfAvg < firstHalfAvg * 0.9 ? 'down' : 'stable';

      setSummary({
        available: availableCount,
        full: fullCount,
        over: overCount,
        utilizationPercentage,
        trend
      });

    } catch (error) {
      console.error('Error fetching capacity data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 dark:bg-white/10 rounded-lg">
              <FaUsersCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Consultant Capacity Overview</h2>
              <p className="text-blue-100 dark:text-blue-200 text-sm">View availability and capacity planning across your team</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-100 dark:text-blue-200">Time Period:</span>
            <div className="flex bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-1">
              {[
                { weeks: 2, label: '2 weeks' },
                { weeks: 4, label: '4 weeks' },
                { weeks: 8, label: '8 weeks' },
                { weeks: 12, label: '12 weeks' }
              ].map(({ weeks: w, label }) => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    weeks === w
                      ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Summary Cards - Compact */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* This Week's Capacity */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 dark:bg-green-600 rounded-lg">
                  <FaCheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{summary.available}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Available (≤30h/wk)</p>
                </div>
              </div>
            </div>

            {/* Fully Allocated */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg">
                  <FaUsers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{summary.full}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Full (30-40h/wk)</p>
                </div>
              </div>
            </div>

            {/* Over-Allocated */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 dark:bg-red-600 rounded-lg">
                  <FaExclamationTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{summary.over}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Over (&gt;40h/wk)</p>
                </div>
              </div>
            </div>

            {/* Utilization & Trend */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 dark:bg-purple-600 rounded-lg">
                  {summary.trend === 'up' ? (
                    <FaArrowUp className="w-5 h-5 text-white" />
                  ) : summary.trend === 'down' ? (
                    <FaArrowDown className="w-5 h-5 text-white" />
                  ) : (
                    <FaMinus className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{summary.utilizationPercentage}%</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Utilization ({summary.trend === 'up' ? '↑' : summary.trend === 'down' ? '↓' : '→'})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Consultant List */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Consultant Availability Details</h3>

              {/* Search Input */}
              <div className="relative w-64">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search consultants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
          {(() => {
            const filteredConsultants = consultants
              .filter(consultant => {
                const searchLower = searchQuery.toLowerCase();
                const name = consultant.consultant.name?.toLowerCase() || '';
                const email = consultant.consultant.email?.toLowerCase() || '';
                return name.includes(searchLower) || email.includes(searchLower);
              })
              .sort((a, b) => (a.weeklyBreakdown[0]?.totalHours || 0) - (b.weeklyBreakdown[0]?.totalHours || 0));

            if (filteredConsultants.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <FaSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No consultants found matching "{searchQuery}"</p>
                </div>
              );
            }

            return filteredConsultants.map((consultant) => {
              const thisWeekHours = consultant.weeklyBreakdown[0]?.totalHours || 0;
              const totalCapacity = 40 * weeks; // Total capacity over selected weeks
              const totalAllocated = consultant.totalAllocatedHours; // Total allocated over selected weeks
              const availableHours = Math.max(0, totalCapacity - totalAllocated);
              const status = thisWeekHours <= 30 ? 'available' : thisWeekHours <= 40 ? 'full' : 'over';
              const isExpanded = expandedConsultant === consultant.consultant.id;

              return (
                <div
                  key={consultant.consultant.id}
                  className="border rounded-lg overflow-hidden bg-card"
                >
                  {/* Consultant Header - Clickable */}
                  <button
                    onClick={() => setExpandedConsultant(isExpanded ? null : consultant.consultant.id)}
                    className={`w-full flex items-center justify-between p-4 border ${
                      status === 'available'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : status === 'full'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    } hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">
                        {consultant.consultant.name || consultant.consultant.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This week: {thisWeekHours}h | Next {weeks} weeks avg: {consultant.averageHoursPerWeek}h
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          status === 'available' ? 'text-green-600 dark:text-green-400' :
                          status === 'full' ? 'text-blue-600 dark:text-blue-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {Math.round(availableHours)}h
                        </p>
                        <p className="text-xs text-muted-foreground">available (total)</p>
                      </div>
                      {isExpanded ? (
                        <FaChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <FaChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Weekly Breakdown - Expandable */}
                  {isExpanded && (
                    <div className="px-4 py-3 border-t border-border bg-muted/30">
                      <div className="flex items-center gap-2 mb-3">
                        <FaChartBar className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold text-foreground">Week-by-Week Breakdown</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {consultant.weeklyBreakdown.map((week, idx) => {
                          const weekCapacity = 40;
                          const weekAvailable = Math.max(0, weekCapacity - week.totalHours);
                          const utilizationPercent = Math.min(100, (week.totalHours / weekCapacity) * 100);
                          const weekStatus = week.status;

                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'available':
                                return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700';
                              case 'partially-busy':
                                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700';
                              case 'busy':
                                return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
                              case 'overloaded':
                                return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700';
                              default:
                                return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700';
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

                          return (
                            <div
                              key={idx}
                              className="bg-card rounded-lg p-3 border border-border hover:shadow-md transition-shadow"
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
                                  <span className="font-medium text-green-600 dark:text-green-400">{weekAvailable}h</span>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    weekStatus === 'available'
                                      ? 'bg-green-500'
                                      : weekStatus === 'partially-busy'
                                      ? 'bg-yellow-500'
                                      : weekStatus === 'busy'
                                      ? 'bg-orange-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${utilizationPercent}%` }}
                                />
                              </div>

                              {/* Status Badge */}
                              <div className="mb-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(weekStatus)}`}>
                                  {getStatusLabel(weekStatus)}
                                </span>
                              </div>

                              {/* Project Breakdown */}
                              {week.projects.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Projects:</p>
                                  {week.projects.map((project, pIdx) => (
                                    <div
                                      key={pIdx}
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
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
