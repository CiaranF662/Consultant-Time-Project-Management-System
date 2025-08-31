// src/app/components/budget/BudgetTracker.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import { generateColorFromString } from '@/lib/colors';

interface BudgetData {
  projectId: string;
  projectTitle: string;
  totalBudgetHours: number;
  phases: {
    id: string;
    name: string;
    allocatedHours: number;
    usedHours: number;
    consultants: {
      id: string;
      name: string;
      allocatedHours: number;
      usedHours: number;
    }[];
  }[];
  summary: {
    totalAllocated: number;
    totalUsed: number;
    totalRemaining: number;
    utilizationPercentage: number;
    allocationPercentage: number;
  };
}

interface BudgetTrackerProps {
  projectId: string;
  showDetails?: boolean;
  compact?: boolean;
}

export default function BudgetTracker({ 
  projectId, 
  showDetails = true, 
  compact = false 
}: BudgetTrackerProps) {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgetData();
  }, [projectId]);

  const fetchBudgetData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`/api/projects/${projectId}/budget`);
      setBudgetData(response.data);
    } catch (err) {
      setError('Failed to load budget data');
      console.error('Budget fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getBudgetStatus = (allocatedPercent: number, usedPercent: number) => {
    if (usedPercent > 90) {
      return { icon: FaExclamationTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    }
    if (usedPercent > 75) {
      return { icon: FaExclamationTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    }
    if (allocatedPercent > 100) {
      return { icon: FaInfoCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    }
    return { icon: FaCheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md border p-4 ${compact ? 'h-32' : 'h-64'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          {!compact && (
            <>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (error || !budgetData) {
    return (
      <div className="bg-white rounded-lg shadow-md border p-4">
        <div className="text-center text-red-500">
          <FaExclamationTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error || 'No budget data available'}</p>
        </div>
      </div>
    );
  }

  const { summary } = budgetData;
  const budgetStatus = getBudgetStatus(summary.allocationPercentage, summary.utilizationPercentage);
  const StatusIcon = budgetStatus.icon;

  // Compact view for dashboard cards
  if (compact) {
    return (
      <div className={`p-4 rounded-lg ${budgetStatus.bg} ${budgetStatus.border} border`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${budgetStatus.color}`} />
            <span className="font-medium text-gray-800">Budget</span>
          </div>
          <span className={`text-sm font-semibold ${budgetStatus.color}`}>
            {Math.round(summary.utilizationPercentage)}%
          </span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Used:</span>
            <span>{summary.totalUsed}h / {budgetData.totalBudgetHours}h</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, summary.utilizationPercentage)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Budget Tracker</h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${budgetStatus.bg}`}>
            <StatusIcon className={`w-4 h-4 ${budgetStatus.color}`} />
            <span className={`text-sm font-medium ${budgetStatus.color}`}>
              {summary.utilizationPercentage > 90 ? 'Critical' :
               summary.utilizationPercentage > 75 ? 'Warning' :
               summary.allocationPercentage > 100 ? 'Over-allocated' : 'On Track'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Total Budget</div>
            <div className="text-2xl font-bold text-blue-800">{budgetData.totalBudgetHours}h</div>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-600 font-medium">Allocated</div>
            <div className="text-2xl font-bold text-green-800">{summary.totalAllocated}h</div>
            <div className="text-xs text-green-600">({Math.round(summary.allocationPercentage)}%)</div>
          </div>
          
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-sm text-orange-600 font-medium">Used</div>
            <div className="text-2xl font-bold text-orange-800">{summary.totalUsed}h</div>
            <div className="text-xs text-orange-600">({Math.round(summary.utilizationPercentage)}%)</div>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 font-medium">Remaining</div>
            <div className="text-2xl font-bold text-gray-800">{summary.totalRemaining}h</div>
            <div className="text-xs text-gray-600">Available</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>Budget Utilization</span>
            <span>{Math.round(summary.utilizationPercentage)}% used</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                summary.utilizationPercentage > 90 ? 'bg-red-500' :
                summary.utilizationPercentage > 75 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, summary.utilizationPercentage)}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm mt-3 mb-1">
            <span>Budget Allocation</span>
            <span>{Math.round(summary.allocationPercentage)}% allocated</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                summary.allocationPercentage > 100 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, summary.allocationPercentage)}%` }}
            />
          </div>
        </div>

        {/* Phase Breakdown */}
        {showDetails && budgetData.phases.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Phase Breakdown</h4>
            <div className="space-y-3">
              {budgetData.phases.map((phase) => (
                <div key={phase.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800">{phase.name}</span>
                    <span className="text-sm text-gray-600">
                      {phase.usedHours}h / {phase.allocatedHours}h
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${Math.min(100, (phase.usedHours / Math.max(phase.allocatedHours, 1)) * 100)}%` 
                      }}
                    />
                  </div>
                  
                  {/* Consultant breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    {phase.consultants.map((consultant) => (
                      <div key={consultant.id} className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-1 rounded ${generateColorFromString(consultant.id)}`}>
                          {consultant.name}
                        </span>
                        <span className="text-gray-600">
                          {consultant.usedHours}h / {consultant.allocatedHours}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}