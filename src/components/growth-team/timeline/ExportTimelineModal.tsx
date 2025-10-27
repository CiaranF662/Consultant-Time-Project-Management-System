'use client';

import { useState, useMemo } from 'react';
import { FaTimes, FaFileExcel, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';
import { startOfWeek, endOfWeek, format } from 'date-fns';

interface ExportTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (startDate: Date, endDate: Date) => void;
  currentViewStartDate: string | Date;
  currentViewEndDate: string | Date;
}

type ExportMode = 'current' | 'custom';

export default function ExportTimelineModal({
  isOpen,
  onClose,
  onExport,
  currentViewStartDate,
  currentViewEndDate
}: ExportTimelineModalProps) {
  const [exportMode, setExportMode] = useState<ExportMode>('current');

  // Convert to Date objects if they're strings
  const viewStartDate = typeof currentViewStartDate === 'string' ? new Date(currentViewStartDate) : currentViewStartDate;
  const viewEndDate = typeof currentViewEndDate === 'string' ? new Date(currentViewEndDate) : currentViewEndDate;

  const [startDate, setStartDate] = useState<string>(viewStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(viewEndDate.toISOString().split('T')[0]);

  // Calculate aligned week boundaries for custom range
  const alignedDates = useMemo(() => {
    if (exportMode !== 'custom') return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const alignedStart = startOfWeek(start, { weekStartsOn: 1 });
    const alignedEnd = endOfWeek(end, { weekStartsOn: 1 });

    const isStartAligned = start.getTime() === alignedStart.getTime();
    const isEndAligned = end.getTime() === alignedEnd.getTime();

    return {
      alignedStart,
      alignedEnd,
      isStartAligned,
      isEndAligned,
      startFormatted: format(alignedStart, 'EEEE, MMM d, yyyy'),
      endFormatted: format(alignedEnd, 'EEEE, MMM d, yyyy')
    };
  }, [exportMode, startDate, endDate]);

  if (!isOpen) return null;

  const handlePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'last4weeks':
        start = new Date(today);
        start.setDate(today.getDate() - 28);
        end = new Date(today);
        break;
      case 'next4weeks':
        start = new Date(today);
        end = new Date(today);
        end.setDate(today.getDate() + 28);
        break;
      case 'next8weeks':
        start = new Date(today);
        end = new Date(today);
        end.setDate(today.getDate() + 56);
        break;
      case 'next12weeks':
        start = new Date(today);
        end = new Date(today);
        end.setDate(today.getDate() + 84);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'nextQuarter':
        const nextQuarter = Math.floor(today.getMonth() / 3) + 1;
        start = new Date(today.getFullYear() + Math.floor(nextQuarter / 4), (nextQuarter % 4) * 3, 1);
        end = new Date(today.getFullYear() + Math.floor(nextQuarter / 4), (nextQuarter % 4) * 3 + 3, 0);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setExportMode('custom');
  };

  const handleExport = () => {
    if (exportMode === 'current') {
      onExport(viewStartDate, viewEndDate);
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        alert('Start date must be before end date');
        return;
      }

      onExport(start, end);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header - Excel Green Theme */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaFileExcel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Export to Excel</h1>
              <p className="text-green-100">Download consultant allocation timeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {/* Export Mode Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Select Date Range
            </label>

            {/* Current View Option */}
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              exportMode === 'current'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }">
              <input
                type="radio"
                name="exportMode"
                value="current"
                checked={exportMode === 'current'}
                onChange={(e) => setExportMode(e.target.value as ExportMode)}
                className="mt-1 accent-green-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-foreground">Current View</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Export the date range currently visible in the timeline (
                  {viewStartDate.toLocaleDateString()} - {viewEndDate.toLocaleDateString()})
                </div>
              </div>
            </label>

            {/* Custom Range Option */}
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
              exportMode === 'custom'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }">
              <input
                type="radio"
                name="exportMode"
                value="custom"
                checked={exportMode === 'custom'}
                onChange={(e) => setExportMode(e.target.value as ExportMode)}
                className="mt-1 accent-green-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-foreground">Custom Range</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Select a specific date range or use quick presets
                </div>
              </div>
            </label>
          </div>

          {/* Custom Date Range Section */}
          {exportMode === 'custom' && (
            <div className="space-y-4 pl-8 border-l-2 border-green-500">
              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    onClick={() => handlePreset('last4weeks')}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground transition-colors"
                  >
                    Last 4 Weeks
                  </button>
                  <button
                    onClick={() => handlePreset('next4weeks')}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground transition-colors"
                  >
                    Next 4 Weeks
                  </button>
                  <button
                    onClick={() => handlePreset('next8weeks')}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground transition-colors"
                  >
                    Next 8 Weeks
                  </button>
                  <button
                    onClick={() => handlePreset('next12weeks')}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground transition-colors"
                  >
                    Next 12 Weeks
                  </button>
                  <button
                    onClick={() => handlePreset('thisQuarter')}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground transition-colors"
                  >
                    This Quarter
                  </button>
                  <button
                    onClick={() => handlePreset('nextQuarter')}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground transition-colors"
                  >
                    Next Quarter
                  </button>
                </div>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    <FaCalendarAlt className="inline mr-2" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    <FaCalendarAlt className="inline mr-2" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Week Alignment Info */}
              {alignedDates && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FaInfoCircle className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Week-aligned export range:
                      </p>
                      <p className="text-green-800 dark:text-green-200">
                        <span className="font-medium">{alignedDates.startFormatted}</span>
                        {' '} to {' '}
                        <span className="font-medium">{alignedDates.endFormatted}</span>
                      </p>
                      {(!alignedDates.isStartAligned || !alignedDates.isEndAligned) && (
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          ℹ️ Dates adjusted to full week boundaries (Monday-Sunday)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Info */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              What will be exported?
            </h3>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
              <li>Summary sheet with consultant allocation grid</li>
              <li>Detailed breakdown of all allocations</li>
              <li>Color-coded cells based on capacity (red &gt; 40h, yellow 30-40h, green &lt; 30h)</li>
              <li>SUM formulas for totals</li>
              <li>Frozen headers for easy navigation</li>
            </ul>
          </div>
          </div>
        </div>

        {/* Modal Footer - Fixed */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-card-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 py-2 px-6 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <FaFileExcel />
            Export to Excel
          </button>
        </div>
      </div>
    </div>
  );
}
