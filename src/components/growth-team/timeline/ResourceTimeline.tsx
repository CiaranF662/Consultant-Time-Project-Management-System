'use client';

import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { formatHours, getUtilizationColor } from '@/lib/dates';
import { ComponentLoading } from '@/components/ui/LoadingSpinner';
import { FaSearch, FaTimes, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx-js-style';
import ExportTimelineModal from './ExportTimelineModal';
import './timeline-animations.css';

interface ResourceTimelineProps {
  consultants: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  weeks: number;
  onConsultantClick?: (consultantId: string) => void;
  initialTimelineData?: {
    timeline: TimelineData[];
    weeks: Array<{label: string; isCurrent: boolean; isPast: boolean}>;
  };
}

interface TimelineData {
  consultantId: string;
  consultantName: string;
  isProductManager: boolean;
  managedProjects: Array<{
    id: string;
    title: string;
  }>;
  weeklyData: Array<{
    week: string;
    weekStart: Date;
    weekEnd: Date;
    totalHours: number;
    allocations: Array<{
      id: string;
      hours: number;
      project: string;
      projectId: string;
      phase: string;
      phaseId: string;
      phaseAllocationId: string;
      consultantDescription?: string;
      isProductManager: boolean;
      sprint?: {
        sprintNumber: number;
        weekOfSprint: number;
        sprintId: string;
      } | null;
    }>;
  }>;
}

export default function ResourceTimeline({ consultants, weeks, onConsultantClick, initialTimelineData }: ResourceTimelineProps) {
  const [timelineData, setTimelineData] = useState<TimelineData[]>(initialTimelineData?.timeline || []);
  const [loading, setLoading] = useState(!initialTimelineData);
  const [selectedWeek, setSelectedWeek] = useState<{
    consultant: string;
    week: string;
    consultantName: string;
    weekData: any;
    weekLabel: string;
  } | null>(null);
  const [weekHeaders, setWeekHeaders] = useState<Array<{label: string; isCurrent: boolean; isPast: boolean}>>([]);
  const [lastFetchedWeeks, setLastFetchedWeeks] = useState<number>(initialTimelineData ? weeks : 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number; key: string } | null>(null);
  const [pressedCell, setPressedCell] = useState<string | null>(null);

  // Initialize week headers from initial data
  useEffect(() => {
    if (initialTimelineData?.weeks) {
      setWeekHeaders(initialTimelineData.weeks);
    }
  }, [initialTimelineData]);

  useEffect(() => {
    // Only fetch if weeks changed or if we don't have initial data
    if (!initialTimelineData || weeks !== lastFetchedWeeks) {
      fetchTimelineData();
    }
  }, [weeks, lastFetchedWeeks, initialTimelineData]);

  // Add real-time refetch capability for data updates
  useEffect(() => {
    // Listen for custom events that indicate data has changed
    const handleDataUpdate = () => {
      fetchTimelineData();
    };

    // Listen for storage events (for cross-tab updates)
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'timeline-data-updated') {
        handleDataUpdate();
      }
    };

    window.addEventListener('timeline-data-updated', handleDataUpdate as EventListener);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('timeline-data-updated', handleDataUpdate as EventListener);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/timeline?weeks=${weeks}`);
      const { timeline, weeks: apiWeeks } = response.data;

      // Ensure all consultants have exactly the same number of weeks
      const normalizedTimeline = timeline.map((consultant: any) => ({
        ...consultant,
        weeklyData: apiWeeks.map((week: any, index: number) => {
          // Find matching week data or return empty week
          const existingWeek = consultant.weeklyData[index];
          if (existingWeek &&
              new Date(existingWeek.weekStart).getTime() === new Date(week.weekStart).getTime()) {
            return existingWeek;
          }

          // Return empty week with correct structure
          return {
            week: week.label,
            weekStart: new Date(week.weekStart),
            weekEnd: new Date(week.weekEnd),
            totalHours: 0,
            allocations: []
          };
        })
      }));

      setTimelineData(normalizedTimeline);
      setLastFetchedWeeks(weeks);

      // Use API weeks for headers to ensure perfect alignment
      setWeekHeaders(apiWeeks.map((w: any) => {
        const weekDate = new Date(w.weekStart);
        const today = new Date();
        const isCurrentWeek = weekDate <= today && today <= new Date(w.weekEnd);
        const isPastWeek = new Date(w.weekEnd) < today;

        return {
          label: w.label,
          isCurrent: isCurrentWeek,
          isPast: isPastWeek
        };
      }));
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleWeekClick = (consultantId: string, weekIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    const consultant = consultants.find(c => c.id === consultantId);
    const consultantData = timelineData.find(td => td.consultantId === consultantId);
    const weekData = consultantData?.weeklyData[weekIndex];
    const weekKey = `${consultantId}-${weekIndex}`;

    // Create ripple effect
    if (weekData && weekData.allocations.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setRipplePosition({ x, y, key: weekKey });

      // Clear ripple after animation
      setTimeout(() => setRipplePosition(null), 600);
    }

    if (selectedWeek?.consultant === consultantId && selectedWeek?.week === weekKey) {
      setSelectedWeek(null);
    } else if (weekData && weekData.allocations.length > 0) {
      setSelectedWeek({
        consultant: consultantId,
        week: weekKey,
        consultantName: consultant?.name || consultant?.email || 'Unknown',
        weekData,
        weekLabel: weekHeaders[weekIndex]?.label || `Week ${weekIndex + 1}`
      });
    }
  };

  // Export to Excel function
  const handleExportToExcel = async (startDate: Date, endDate: Date) => {
    try {
      // Fetch data for the specified date range
      const response = await axios.get('/api/timeline', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      const { timeline: exportTimelineData, weeks: exportWeekHeaders } = response.data;

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Prepare summary sheet data (consultant x week grid)
      const summaryData: any[][] = [];

      // Header row
      const headerRow = ['Consultant', ...exportWeekHeaders.map((w: any) => w.label)];
      summaryData.push(headerRow);

      // Data rows - one per consultant
      exportTimelineData.forEach((consultant: any) => {
        const row = [
          consultant.consultantName,
          ...consultant.weeklyData.map((week: any) => week.totalHours)
        ];
        summaryData.push(row);
      });

      // Add totals row with formula placeholders
      const totalsRow = ['TOTAL'];
      for (let i = 0; i < exportWeekHeaders.length; i++) {
        totalsRow.push(''); // Will be replaced with formula
      }
      summaryData.push(totalsRow);

      // Create summary sheet
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      // Apply styles and formatting
      const range = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1');

      // Style header row (row 0) - Bold and gray background
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!summarySheet[cellAddress]) continue;

        summarySheet[cellAddress].s = {
          font: { bold: true, sz: 12 },
          fill: { fgColor: { rgb: "D3D3D3" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }

      // Style totals row (last row) - Bold
      const totalRowIndex = range.e.r;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });

        if (col === 0) {
          // "TOTAL" label
          if (!summarySheet[cellAddress]) continue;
          summarySheet[cellAddress].s = {
            font: { bold: true, sz: 11 },
            fill: { fgColor: { rgb: "E8E8E8" } },
            alignment: { horizontal: "left", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        } else {
          // SUM formula for each week column
          const startRow = 2; // Data starts at row 2 (0-indexed: header is 0, data starts at 1)
          const endRow = totalRowIndex; // Last data row before totals
          const colLetter = XLSX.utils.encode_col(col);

          summarySheet[cellAddress] = {
            f: `SUM(${colLetter}${startRow}:${colLetter}${endRow})`,
            t: 'n',
            s: {
              font: { bold: true, sz: 11 },
              fill: { fgColor: { rgb: "E8E8E8" } },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            }
          };
        }
      }

      // Apply conditional formatting to data cells (color based on hours) and style consultant names
      for (let row = 1; row < totalRowIndex; row++) { // Skip header and totals
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          let cell = summarySheet[cellAddress];

          // Create cell if it doesn't exist (for zero values)
          if (!cell) {
            summarySheet[cellAddress] = { t: 'n', v: 0 };
            cell = summarySheet[cellAddress];
          }

          if (col === 0) {
            // Style consultant name column
            cell.s = {
              font: { bold: false, sz: 11 },
              alignment: { horizontal: "left", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "D3D3D3" } },
                bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                left: { style: "thin", color: { rgb: "D3D3D3" } },
                right: { style: "thin", color: { rgb: "D3D3D3" } }
              }
            };
          } else {
            // Style hour cells with conditional formatting
            const hours = typeof cell.v === 'number' ? cell.v : 0;
            let bgColor = 'FFFFFF'; // White default

            // Color scale based on capacity
            if (hours > 40) {
              bgColor = 'FFC7CE'; // Red - over capacity
            } else if (hours >= 30) {
              bgColor = 'FFEB9C'; // Yellow - near capacity
            } else if (hours > 0) {
              bgColor = 'C6EFCE'; // Green - under capacity
            }

            cell.s = {
              fill: { fgColor: { rgb: bgColor } },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "D3D3D3" } },
                bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                left: { style: "thin", color: { rgb: "D3D3D3" } },
                right: { style: "thin", color: { rgb: "D3D3D3" } }
              }
            };
          }
        }
      }

      // Freeze panes: freeze first row and first column
      summarySheet['!freeze'] = { xSplit: 1, ySplit: 1 };

      // Set column widths
      summarySheet['!cols'] = [
        { wch: 20 }, // Consultant name column
        ...exportWeekHeaders.map(() => ({ wch: 10 })) // Week columns
      ];

      // Add summary sheet to workbook
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Prepare detailed sheet data (flat list of all allocations)
      const detailData: any[][] = [];

      // Header row for details
      detailData.push(['Consultant', 'Week', 'Total Hours', 'Project', 'Phase', 'Hours', 'Sprint']);

      // Data rows - one per allocation
      exportTimelineData.forEach((consultant: any) => {
        consultant.weeklyData.forEach((week: any, weekIndex: number) => {
          if (week.allocations && week.allocations.length > 0) {
            week.allocations.forEach((allocation: any) => {
              detailData.push([
                consultant.consultantName,
                exportWeekHeaders[weekIndex]?.label || `Week ${weekIndex + 1}`,
                week.totalHours,
                allocation.project,
                allocation.phase,
                allocation.hours,
                allocation.sprint
                  ? `Sprint ${allocation.sprint.sprintNumber} (Week ${allocation.sprint.weekOfSprint})`
                  : 'N/A'
              ]);
            });
          } else if (week.totalHours > 0) {
            // Week has hours but no allocations - shouldn't happen but handle it
            detailData.push([
              consultant.consultantName,
              exportWeekHeaders[weekIndex]?.label || `Week ${weekIndex + 1}`,
              week.totalHours,
              'N/A',
              'N/A',
              week.totalHours,
              'N/A'
            ]);
          }
        });
      });

      // Check if there's any data to export
      const hasData = exportTimelineData.some((c: any) =>
        c.weeklyData.some((w: any) => w.totalHours > 0)
      );

      if (!hasData) {
        alert('No allocation data found for the selected date range. Please ensure:\n\n1. There are approved weekly allocations in this date range\n2. The consultants have been assigned to projects with allocations\n\nTry selecting "Current View" to export the visible timeline data.');
        return;
      }

      // Create details sheet
      const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

      // Style header row in details sheet
      const detailRange = XLSX.utils.decode_range(detailSheet['!ref'] || 'A1');
      for (let col = detailRange.s.c; col <= detailRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!detailSheet[cellAddress]) continue;

        detailSheet[cellAddress].s = {
          font: { bold: true, sz: 11 },
          fill: { fgColor: { rgb: "D3D3D3" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }

      // Add borders to all cells in details sheet
      for (let row = detailRange.s.r; row <= detailRange.e.r; row++) {
        for (let col = detailRange.s.c; col <= detailRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = detailSheet[cellAddress];

          if (!cell) continue;

          if (!cell.s) cell.s = {};
          cell.s.border = {
            top: { style: "thin", color: { rgb: "D3D3D3" } },
            bottom: { style: "thin", color: { rgb: "D3D3D3" } },
            left: { style: "thin", color: { rgb: "D3D3D3" } },
            right: { style: "thin", color: { rgb: "D3D3D3" } }
          };

          // Center align numeric columns
          if (col === 2 || col === 5) { // Total Hours and Hours columns
            if (!cell.s.alignment) cell.s.alignment = {};
            cell.s.alignment.horizontal = "center";
          }
        }
      }

      // Freeze header row in details sheet
      detailSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

      // Set column widths for details
      detailSheet['!cols'] = [
        { wch: 20 }, // Consultant
        { wch: 12 }, // Week
        { wch: 12 }, // Total Hours
        { wch: 25 }, // Project
        { wch: 25 }, // Phase
        { wch: 10 }, // Hours
        { wch: 18 }  // Sprint
      ];

      // Add details sheet to workbook
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Details');

      // Generate filename with improved format
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      const createdStr = new Date().toISOString().split('T')[0];
      const filename = `Consultant Allocation from ${startStr} to ${endStr} created ${createdStr}.xlsx`;

      // Write and download with cellStyles option enabled
      XLSX.writeFile(workbook, filename, { cellStyles: true });
    } catch (error) {
      alert('Failed to export data. Please try again.');
    }
  };

  // Filter consultants based on search query
  const filteredConsultants = consultants.filter(consultant => {
    if (!searchQuery.trim()) return true;
    const name = (consultant.name || consultant.email || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return <ComponentLoading message="Loading resource timeline..." />;
  }

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Action Bar - Above the timeline */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Search */}
          <div className="flex items-center gap-2 flex-1">
            {showSearch ? (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search consultants..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FaSearch className="w-3.5 h-3.5" />
                Search
              </button>
            )}
          </div>

          {/* Right side - Export */}
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
          >
            <FaFileExcel className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Timeline Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <div className={`${weeks >= 32 ? 'min-w-[3600px]' : weeks >= 24 ? 'min-w-[2400px]' : weeks >= 12 ? 'min-w-[1300px]' : 'min-w-[1000px]'} ${weeks >= 32 ? 'pr-4' : ''}`}>
          {/* Header */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-20 shadow-[0_2px_4px_-1px_rgba(0,0,0,0.1)]">
            <div className="w-56 md:w-64 p-4 font-semibold text-card-foreground border-r border-gray-200 dark:border-gray-700 flex-shrink-0 sticky left-0 bg-gray-50 dark:bg-gray-800 z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]">
              Consultant
            </div>
          <div className="flex-1 flex">
            {weekHeaders.map((week, index) => (
              <div
                key={index}
                className={`flex-1 ${weeks >= 32 ? 'min-w-[100px]' : weeks >= 24 ? 'min-w-[90px]' : 'min-w-[80px]'} p-2 text-center text-xs font-medium border-r border-gray-200 dark:border-gray-700 ${
                  week.isCurrent ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100 font-bold' :
                  week.isPast ? 'bg-gray-50 dark:bg-gray-800 text-muted-foreground' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {week.label}
                {week.isCurrent && (
                  <div className="text-[10px] font-normal">Current</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* No Results Message */}
        {filteredConsultants.length === 0 && searchQuery.trim() && (
          <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <FaSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No consultants found matching &quot;{searchQuery}&quot;</p>
            </div>
          </div>
        )}

        {/* Consultant Rows */}
        {filteredConsultants
          .sort((a, b) => {
            const consultantDataA = timelineData.find(td => td.consultantId === a.id);
            const consultantDataB = timelineData.find(td => td.consultantId === b.id);

            // Sort by Product Manager status first (PMs at top), then by name
            if (consultantDataA?.isProductManager !== consultantDataB?.isProductManager) {
              return consultantDataB?.isProductManager ? 1 : -1;
            }

            // If both are PMs or both are not PMs, sort alphabetically by name
            const nameA = (a.name || a.email || '').toLowerCase();
            const nameB = (b.name || b.email || '').toLowerCase();
            return nameA.localeCompare(nameB);
          })
          .map((consultant) => {
          const consultantData = timelineData.find(td => td.consultantId === consultant.id);
          
          return (
            <div key={consultant.id} className="flex border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              <div
                className="w-56 md:w-64 p-4 font-medium text-card-foreground border-r border-gray-200 dark:border-gray-700 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 sticky left-0 bg-white dark:bg-gray-900 z-10 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.1)]"
                onClick={() => onConsultantClick?.(consultant.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="truncate flex-1">{consultant.name || consultant.email}</div>
                  {consultantData?.isProductManager && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded-full whitespace-nowrap">
                      PM
                    </span>
                  )}
                </div>
                {consultantData?.isProductManager && consultantData.managedProjects.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    Manages {consultantData.managedProjects.length} project{consultantData.managedProjects.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="flex-1 flex">
                {weekHeaders.map((weekHeader, weekIndex) => {
                  const weekData = consultantData?.weeklyData[weekIndex];
                  const totalHours = weekData?.totalHours || 0;
                  const bgColor = getUtilizationColor(totalHours);
                  const isSelected = selectedWeek?.consultant === consultant.id && 
                                   selectedWeek?.week === `${consultant.id}-${weekIndex}`;
                  const hasAllocations = weekData && weekData.allocations.length > 0;
                  
                  return (
                    <div key={weekIndex} className={`flex-1 ${weeks >= 32 ? 'min-w-[100px]' : weeks >= 24 ? 'min-w-[90px]' : 'min-w-[80px]'} relative group`}>
                      <div
                        className={`p-2 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-700 transition-all duration-200 ${bgColor} ${
                          hasAllocations
                            ? 'cursor-pointer hover:z-10'
                            : 'cursor-default'
                        } ${isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 z-10' : ''} relative overflow-hidden rounded-lg`}
                        onClick={(e) => hasAllocations && handleWeekClick(consultant.id, weekIndex, e)}
                        style={{
                          transform: hasAllocations && isSelected
                            ? 'scale3d(1.03, 1.03, 1)'
                            : pressedCell === `${consultant.id}-${weekIndex}`
                            ? 'scale3d(0.98, 0.98, 1)'
                            : 'scale3d(1, 1, 1)',
                          transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                          backfaceVisibility: 'hidden',
                          WebkitFontSmoothing: 'antialiased'
                        }}
                        onMouseEnter={(e) => {
                          if (hasAllocations) {
                            e.currentTarget.style.transform = 'scale3d(1.03, 1.03, 1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = 'scale3d(1, 1, 1)';
                          }
                        }}
                        onMouseDown={() => {
                          if (hasAllocations) {
                            setPressedCell(`${consultant.id}-${weekIndex}`);
                          }
                        }}
                        onMouseUp={() => setPressedCell(null)}
                      >
                        {/* Ripple effect */}
                        {ripplePosition && ripplePosition.key === `${consultant.id}-${weekIndex}` && (
                          <span
                            className="absolute rounded-full bg-white dark:bg-gray-400 opacity-70 pointer-events-none animate-ripple"
                            style={{
                              left: ripplePosition.x,
                              top: ripplePosition.y,
                              width: 0,
                              height: 0,
                              transform: 'translate(-50%, -50%)',
                            }}
                          />
                        )}

                        {/* Glow effect on hover */}
                        {hasAllocations && (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 opacity-0 group-hover:opacity-15 transition-opacity duration-200 pointer-events-none rounded-lg" />
                        )}

                        <div className={`text-base font-semibold relative z-10 ${hasAllocations ? 'group-hover:text-blue-700 dark:group-hover:text-blue-300' : ''} ${weekHeader.isPast ? 'text-muted-foreground' : ''} transition-colors duration-200`}>
                          {totalHours > 0 ? formatHours(totalHours) : '-'}
                        </div>
                        {hasAllocations && (
                          <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 relative z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-200 font-medium">
                            Click to view
                          </div>
                        )}
                      </div>
                      
                      {/* Tooltip */}
                      {totalHours > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap max-w-xs">
                            <div className="font-semibold mb-1">{formatHours(totalHours)} total</div>
                            {weekData?.allocations.slice(0, 3).map((alloc, i) => (
                              <div key={i} className="py-0.5">
                                {alloc.project}: {formatHours(alloc.hours)}
                              </div>
                            ))}
                            {weekData?.allocations && weekData.allocations.length > 3 && (
                              <div className="text-gray-300">+{weekData.allocations.length - 3} more</div>
                            )}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Week Details Modal */}
      {selectedWeek && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedWeek(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white p-6 rounded-t-lg flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedWeek.consultantName}</h2>
                  <p className="text-blue-100 dark:text-blue-200">{selectedWeek.weekLabel} Allocation Details</p>
                </div>
                <button
                  onClick={() => setSelectedWeek(null)}
                  className="text-blue-100 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                  <span className="text-sm">Total Hours: </span>
                  <span className="font-bold">{formatHours(selectedWeek.weekData.totalHours)}</span>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1">
                  <span className="text-sm">Projects: </span>
                  <span className="font-bold">{new Set(selectedWeek.weekData.allocations.map((a: any) => a.project)).size}</span>
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {selectedWeek.weekData.allocations.map((alloc: any, index: number) => (
                  <div key={alloc.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: `hsl(${Math.abs(alloc.projectId.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)` }}
                          ></div>
                          <h3 className="font-semibold text-foreground">{alloc.project}</h3>
                          {alloc.isProductManager && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-full">
                              Product Manager
                            </span>
                          )}
                        </div>
                        <div className="ml-7">
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{alloc.phase}</p>
                          {alloc.sprint && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded-full">
                                Sprint {alloc.sprint.sprintNumber}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full">
                                Week {alloc.sprint.weekOfSprint} of 2
                              </span>
                            </div>
                          )}
                          {alloc.consultantDescription && (
                            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border-l-4 border-blue-200 dark:border-blue-700">
                              <div className="text-xs font-medium text-card-foreground mb-1">Consultant Plan:</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{alloc.consultantDescription}</div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatHours(alloc.hours)}</span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round((alloc.hours / selectedWeek.weekData.totalHours) * 100)}% of week)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Allocation #{index + 1}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weekly Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-foreground mb-4">Week Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-300 font-medium">Total Allocation</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatHours(selectedWeek.weekData.totalHours)}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-300 font-medium">Utilization</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {Math.round((selectedWeek.weekData.totalHours / 40) * 100)}%
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">Based on 40h work week</div>
                  </div>
                  {(() => {
                    const pmHours = selectedWeek.weekData.allocations.filter((a: any) => a.isProductManager).reduce((sum: number, a: any) => sum + a.hours, 0);
                    const teamHours = selectedWeek.weekData.allocations.filter((a: any) => !a.isProductManager).reduce((sum: number, a: any) => sum + a.hours, 0);
                    return (
                      <>
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
                          <div className="text-sm text-yellow-600 dark:text-yellow-300 font-medium">PM Work</div>
                          <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{formatHours(pmHours)}</div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400">Projects you manage</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                          <div className="text-sm text-purple-600 dark:text-purple-300 font-medium">Team Work</div>
                          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatHours(teamHours)}</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">As team member</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex justify-end rounded-b-lg border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => setSelectedWeek(null)}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Timeline Modal */}
      {showExportModal && weekHeaders.length > 0 && timelineData.length > 0 && (
        <ExportTimelineModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportToExcel}
          currentViewStartDate={timelineData[0]?.weeklyData[0]?.weekStart || new Date()}
          currentViewEndDate={timelineData[0]?.weeklyData[weekHeaders.length - 1]?.weekEnd || new Date()}
        />
      )}
    </div>
  );
}