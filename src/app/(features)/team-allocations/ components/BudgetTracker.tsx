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
    plannedHours: number;
    usedHours: number;
    consultants: {
      id: string;
      name: string;
      allocatedHours: number;
      plannedHours: number;
      usedHours: number;
    }[];
  }[];
  summary: {
    totalBudgeted: number;
    totalAllocated: number;
    totalPlanned: number;
    totalUsed: number;
    totalRemaining: number;
    allocationPercentage: number;
    planningVsAllocationPercentage: number;
    planningVsBudgetPercentage: number;
    utilizationPercentage: number;
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
        {/* Summary Cards - Better Spacing */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div className="text-sm text-blue-600 font-medium mb-1">Total Budget</div>
            <div className="text-3xl font-bold text-blue-800 mb-1">{budgetData.totalBudgetHours}h</div>
            <div className="text-xs text-blue-600">Set by Growth Team</div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <div className="text-sm text-green-600 font-medium mb-1">Allocated</div>
            <div className="text-3xl font-bold text-green-800 mb-1">{summary.totalAllocated}h</div>
            <div className="text-xs text-green-600">{Math.round(summary.allocationPercentage)}% of budget</div>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
            <div className="text-sm text-purple-600 font-medium mb-1">Planned</div>
            <div className="text-3xl font-bold text-purple-800 mb-1">{summary.totalPlanned}h</div>
            <div className="text-xs text-purple-600">{Math.round(summary.planningVsBudgetPercentage)}% of budget</div>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <div className="text-sm text-orange-600 font-medium mb-1">Used (Auto)</div>
            <div className="text-3xl font-bold text-orange-800 mb-1">{summary.totalUsed}h</div>
            <div className="text-xs text-orange-600">{Math.round(summary.utilizationPercentage)}% of budget</div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
            <div className="text-sm text-gray-600 font-medium mb-1">Remaining</div>
            <div className="text-3xl font-bold text-gray-800 mb-1">{summary.totalRemaining}h</div>
            <div className="text-xs text-gray-600">Available to allocate</div>
          </div>
        </div>

        {/* Progress Bars - Three-Tier System */}
        <div className="mb-6 space-y-4">
          {/* 1. Budget Allocation */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Budget Allocation</span>
              <span>{Math.round(summary.allocationPercentage)}% of budget allocated</span>
            </div>
            <div className="text-xs text-gray-500 mb-2">How much budget has been assigned to phases</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  summary.allocationPercentage > 100 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, summary.allocationPercentage)}%` }}
              />
            </div>
          </div>

          {/* 2. Planning Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Planning Progress</span>
              <span>{Math.round(summary.planningVsAllocationPercentage)}% of allocations planned</span>
            </div>
            <div className="text-xs text-gray-500 mb-2">How much allocated work has been scheduled</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  summary.planningVsAllocationPercentage >= 100 ? 'bg-green-500' :
                  summary.planningVsAllocationPercentage >= 75 ? 'bg-yellow-500' : 'bg-purple-500'
                }`}
                style={{ width: `${Math.min(100, summary.planningVsAllocationPercentage)}%` }}
              />
            </div>
          </div>

          {/* 3. Budget Utilization */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Budget Utilization</span>
              <span>{Math.round(summary.utilizationPercentage)}% of budget used</span>
            </div>
            <div className="text-xs text-gray-500 mb-2">Automated based on completed weeks</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  summary.utilizationPercentage > 90 ? 'bg-red-500' :
                  summary.utilizationPercentage > 75 ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(100, summary.utilizationPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mb-6"></div>

        {/* Phase Breakdown */}
        {showDetails && budgetData.phases.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Phase Breakdown</h4>
            <div className="space-y-3">
              {budgetData.phases.map((phase) => (
                <div key={phase.id} className="border rounded-lg p-4">
                  {/* Phase Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">{phase.name}</span>
                      {/* Phase Status Indicator */}
                      {(() => {
                        const planningPercentage = phase.allocatedHours > 0 ? (phase.plannedHours / phase.allocatedHours) * 100 : 0;
                        const utilizationPercentage = phase.allocatedHours > 0 ? (phase.usedHours / phase.allocatedHours) * 100 : 0;
                        
                        let status = { color: 'bg-gray-400', text: 'No allocation', textColor: 'text-gray-600' };
                        
                        if (phase.allocatedHours === 0) {
                          status = { color: 'bg-gray-400', text: 'No allocation', textColor: 'text-gray-600' };
                        } else if (planningPercentage === 0) {
                          status = { color: 'bg-red-400', text: 'Not planned', textColor: 'text-red-600' };
                        } else if (planningPercentage < 75) {
                          status = { color: 'bg-yellow-400', text: 'Partial planning', textColor: 'text-yellow-600' };
                        } else if (utilizationPercentage > 90 && planningPercentage >= 100) {
                          status = { color: 'bg-red-400', text: 'Behind schedule', textColor: 'text-red-600' };
                        } else if (planningPercentage >= 100) {
                          status = { color: 'bg-green-400', text: 'Fully planned', textColor: 'text-green-600' };
                        } else {
                          status = { color: 'bg-blue-400', text: 'In planning', textColor: 'text-blue-600' };
                        }
                        
                        return (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${status.textColor} bg-opacity-20`}>
                            <span className={`w-2 h-2 rounded-full mr-1 ${status.color}`}></span>
                            {status.text}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {phase.allocatedHours}h allocated
                    </div>
                  </div>
                  
                  {/* Planning Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-700 mb-2">
                      <span>Planning Progress</span>
                      <span className="font-medium">{phase.allocatedHours > 0 ? Math.round((phase.plannedHours / phase.allocatedHours) * 100) : 0}% scheduled</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          phase.allocatedHours === 0 ? 'bg-gray-400' :
                          (phase.plannedHours / phase.allocatedHours) * 100 >= 100 ? 'bg-green-500' :
                          (phase.plannedHours / phase.allocatedHours) * 100 >= 75 ? 'bg-yellow-500' : 
                          (phase.plannedHours / phase.allocatedHours) * 100 > 0 ? 'bg-purple-500' : 'bg-red-400'
                        }`}
                        style={{ 
                          width: `${phase.allocatedHours > 0 ? Math.min(100, (phase.plannedHours / phase.allocatedHours) * 100) : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Consultant List */}
                  <div className="space-y-2">
                    {phase.consultants.map((consultant) => (
                      <div key={consultant.id} className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-sm ${generateColorFromString(consultant.id)}`}>
                          {consultant.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {consultant.allocatedHours}h
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