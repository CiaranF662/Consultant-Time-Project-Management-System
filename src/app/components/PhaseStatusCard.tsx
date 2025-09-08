'use client';

import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaClock, FaChartPie, FaPlay, FaEdit } from 'react-icons/fa';
import { getPhaseStatus, getStatusColorClasses, getProgressBarColor, formatHours } from '@/lib/phase-status';
import { generateColorFromString } from '@/lib/colors';

interface PhaseAllocation {
  id: string;
  consultantId: string;
  totalHours: number;
  weeklyAllocations?: Array<{
    id: string;
    plannedHours: number;
    weekStartDate: Date | string;
    weekEndDate: Date | string;
    weekNumber: number;
    year: number;
  }>;
}

interface IndividualAllocation {
  id: string;
  consultantId: string;
  consultantName: string;
  hours: number;
  usedHours: number;
}

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date | string;
  endDate: Date | string;
}

interface PhaseStatusCardProps {
  phase: {
    id: string;
    name: string;
    description?: string;
    startDate: Date | string;
    endDate: Date | string;
    sprints?: Sprint[];
    allocations?: PhaseAllocation[];
  };
  individualAllocations?: IndividualAllocation[];
  showDetails?: boolean;
  showIndividualAllocations?: boolean;
  canManageProject?: boolean;
  canManageAllocations?: boolean;
  onEditPhase?: () => void;
  onManageAllocations?: () => void;
  className?: string;
}

export default function PhaseStatusCard({ 
  phase, 
  individualAllocations = [],
  showDetails = true, 
  showIndividualAllocations = true,
  canManageProject = false,
  canManageAllocations = false,
  onEditPhase,
  onManageAllocations,
  className = '' 
}: PhaseStatusCardProps) {
  // Transform phase data to match the expected format
  const transformedPhase = {
    id: phase.id,
    name: phase.name,
    startDate: new Date(phase.startDate),
    endDate: new Date(phase.endDate),
    sprints: phase.sprints?.map(sprint => ({
      id: sprint.id,
      sprintNumber: sprint.sprintNumber,
      startDate: new Date(sprint.startDate),
      endDate: new Date(sprint.endDate)
    })),
    allocations: phase.allocations?.map(allocation => ({
      id: allocation.id,
      totalHours: allocation.totalHours,
      weeklyAllocations: allocation.weeklyAllocations?.map(week => ({
        id: week.id,
        plannedHours: week.plannedHours,
        weekStartDate: new Date(week.weekStartDate),
        weekEndDate: new Date(week.weekEndDate),
        weekNumber: week.weekNumber,
        year: week.year
      })) || []
    })) || []
  };

  const phaseStatus = getPhaseStatus(transformedPhase);

  const getStatusIcon = (status: string, size = 'w-5 h-5') => {
    switch (status) {
      case 'complete':
        return <FaCheckCircle className={`${size} text-green-500`} />;
      case 'overdue':
        return <FaExclamationTriangle className={`${size} text-red-500`} />;
      case 'in_progress':
        return <FaClock className={`${size} text-blue-500`} />;
      case 'ready':
        return <FaPlay className={`${size} text-purple-500`} />;
      case 'planning':
        return <FaChartPie className={`${size} text-yellow-500`} />;
      default:
        return <FaClock className={`${size} text-gray-500`} />;
    }
  };

  const totalAllocatedHours = phaseStatus.details.planning.totalAllocatedHours;
  const totalDistributedHours = phaseStatus.details.planning.totalDistributedHours;

  return (
    <div className={`bg-white rounded-lg border-l-4 shadow-sm ${className}`} 
         style={{ borderLeftColor: phaseStatus.color === 'green' ? '#10B981' : 
                                   phaseStatus.color === 'red' ? '#EF4444' :
                                   phaseStatus.color === 'blue' ? '#3B82F6' :
                                   phaseStatus.color === 'purple' ? '#8B5CF6' :
                                   phaseStatus.color === 'yellow' ? '#F59E0B' : '#6B7280' }}>
      
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900">{phase.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
            </p>
            {phase.description && (
              <p className="text-sm text-gray-600 mt-2">{phase.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            {/* Total Hours Summary */}
            <div className="text-right text-sm">
              <div className="font-medium">{formatHours(totalAllocatedHours)} allocated</div>
              <div className="text-gray-500">{formatHours(totalDistributedHours)} planned</div>
            </div>
            
            {/* Management Buttons */}
            {canManageProject && (
              <div className="flex items-center gap-1">
                {onEditPhase && (
                  <button 
                    onClick={onEditPhase}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Edit Phase"
                  >
                    <FaEdit />
                  </button>
                )}
                {canManageAllocations && onManageAllocations && (
                  <button 
                    onClick={onManageAllocations}
                    className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    Manage Hours
                  </button>
                )}
              </div>
            )}
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {getStatusIcon(phaseStatus.status)}
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColorClasses(phaseStatus.color)}`}>
                {phaseStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Sprint Info */}
        {phase.sprints && phase.sprints.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Sprints:</span>
            <div className="flex flex-wrap gap-1">
              {phase.sprints
                .sort((a, b) => a.sprintNumber - b.sprintNumber)
                .map((sprint) => (
                  <span key={sprint.id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    Sprint {sprint.sprintNumber}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Details */}
      {showDetails && (
        <div className="p-4 space-y-4">
          
          {/* Planning Progress */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-medium text-gray-700">Planning Progress</span>
              <span className="text-gray-600">
                {formatHours(totalDistributedHours)} / {formatHours(totalAllocatedHours)}
                {totalAllocatedHours > 0 && (
                  <span className="ml-1 text-xs">({phaseStatus.details.planning.completionPercentage}%)</span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  phaseStatus.details.planning.status === 'complete' ? 'bg-green-500' : 
                  phaseStatus.details.planning.remainingToDistribute < 0 ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ 
                  width: `${Math.min(phaseStatus.details.planning.completionPercentage, 100)}%` 
                }}
              />
            </div>
            {phaseStatus.details.planning.remainingToDistribute !== 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {phaseStatus.details.planning.remainingToDistribute > 0 
                  ? `${formatHours(phaseStatus.details.planning.remainingToDistribute)} remaining to distribute`
                  : `${formatHours(Math.abs(phaseStatus.details.planning.remainingToDistribute))} over-allocated`
                }
              </div>
            )}
          </div>

          {/* Work Progress */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="font-medium text-gray-700">Work Progress</span>
              <span className="text-gray-600">
                {formatHours(phaseStatus.details.work.expectedCompletionByNow)} / {formatHours(phaseStatus.details.work.totalPlannedHours)}
                {phaseStatus.details.work.totalPlannedHours > 0 && (
                  <span className="ml-1 text-xs">({phaseStatus.details.work.workCompletionPercentage}%)</span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getProgressBarColor(phaseStatus.status, phaseStatus.details.overall.isOnTrack)}`}
                style={{ 
                  width: `${Math.min(phaseStatus.details.work.workCompletionPercentage, 100)}%` 
                }}
              />
            </div>
            
            {/* Current Week Progress */}
            {phaseStatus.details.work.currentWeekProgress && (
              <div className="text-xs text-gray-500 mt-1">
                {phaseStatus.details.work.currentWeekProgress.sprintNumber && phaseStatus.details.work.currentWeekProgress.sprintWeek ? (
                  <>Current: {Math.round(phaseStatus.details.work.currentWeekProgress.weekProgress * 100)}% through Sprint {phaseStatus.details.work.currentWeekProgress.sprintNumber}, Week {phaseStatus.details.work.currentWeekProgress.sprintWeek}</>
                ) : (
                  <>Current week: {Math.round(phaseStatus.details.work.currentWeekProgress.weekProgress * 100)}% complete</>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Individual Consultant Allocations */}
      {showIndividualAllocations && individualAllocations.length > 0 && (
        <div className="p-4 border-t border-gray-100">
          <h4 className="font-medium text-gray-800 mb-3">Individual Allocations</h4>
          <div className="space-y-2">
            {individualAllocations.map((allocation) => (
              <div key={allocation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-sm font-medium ${generateColorFromString(allocation.consultantId)}`}>
                    {allocation.consultantName}
                  </span>
                  <div className="text-sm text-gray-600">
                    {formatHours(allocation.hours)} allocated
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-gray-600">{formatHours(allocation.usedHours)} used</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-600">{formatHours(allocation.hours - allocation.usedHours)} remaining</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (allocation.usedHours / Math.max(allocation.hours, 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline & Status Info */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Timeline: {phaseStatus.details.time.status === 'future' ? 'Upcoming' : 
                                phaseStatus.details.time.status === 'active' ? 'Active' : 'Past'}</span>
                {phaseStatus.details.time.status === 'active' && (
                  <span>{phaseStatus.details.time.timeElapsedPercentage}% time elapsed</span>
                )}
              </div>
              <span className={`font-medium ${
                phaseStatus.details.overall.riskLevel === 'high' ? 'text-red-600' :
                phaseStatus.details.overall.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                Risk: {phaseStatus.details.overall.riskLevel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* No Allocations Message */}
      {showIndividualAllocations && individualAllocations.length === 0 && (
        <div className="p-4 border-t border-gray-100">
          <div className="text-center py-6">
            <div className="text-gray-500 mb-2">No resource allocations yet</div>
            {canManageAllocations && onManageAllocations && (
              <button 
                onClick={onManageAllocations}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Allocate Resources →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}