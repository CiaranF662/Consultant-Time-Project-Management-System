'use client';

import { useState } from 'react';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

export interface ProjectFilters {
  search: string;
  status: 'all' | 'current' | 'upcoming' | 'past';
  sortBy: 'name' | 'startDate' | 'endDate' | 'budget';
  sortOrder: 'asc' | 'desc';
}

interface ProjectSearchFilterProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  showStatusFilter?: boolean;
}

export default function ProjectSearchFilter({
  filters,
  onFiltersChange,
  showStatusFilter = true
}: ProjectSearchFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof ProjectFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      sortBy: 'startDate',
      sortOrder: 'desc'
    });
    setShowAdvanced(false);
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.sortBy !== 'startDate' || filters.sortOrder !== 'desc';

  return (
    <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-200/60 dark:border-gray-700/60 overflow-hidden mb-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center">
              <FaFilter className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Search & Filter</h3>
              <p className="text-sm text-muted-foreground">Find specific projects quickly</p>
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-card-foreground bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <FaTimes className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div className="px-6 py-5 bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Enhanced Search Input */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Search Projects
            </label>
            <div className="relative group">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search by project name, description, or consultant..."
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 group-focus-within:shadow-md"
              />
            </div>
          </div>

          {/* Toggle Advanced Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                showAdvanced
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm'
              }`}
            >
              <FaFilter className={showAdvanced ? 'animate-pulse' : ''} />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Section */}
      {showAdvanced && (
        <div className="px-6 py-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            {showStatusFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">All Projects</option>
                  <option value="current">Current</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
            )}

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="name">Project Name</option>
                <option value="startDate">Start Date</option>
                <option value="endDate">End Date</option>
                <option value="budget">Budget</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => updateFilter('sortOrder', e.target.value)}
                className="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="asc">Ascending (A-Z, Old-New)</option>
                <option value="desc">Descending (Z-A, New-Old)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
