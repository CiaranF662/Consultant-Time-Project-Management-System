'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaCheckCircle, FaExclamationTriangle, FaClock, FaChartPie, FaPlay, FaEdit, FaHourglassHalf, FaTimesCircle, FaExternalLinkAlt, FaChevronDown, FaChevronUp, FaLock } from 'react-icons/fa';
import { getPhaseStatus, getStatusColorClasses, getProgressBarColor, formatHours } from '@/lib/phase-status';
import { generateColorFromString } from '@/lib/colors';
import { formatDate } from '@/lib/dates';
import { isPhaseLocked } from '@/lib/phase-lock';

interface PhaseAllocation {
  id: string;
  consultantId: string;
  totalHours: number;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'FORFEITED';
  rejectionReason?: string | null;
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
  plannedHours: number;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'FORFEITED';
  rejectionReason?: string | null;
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
  currentUserId?: string; // For determining if allocation belongs to current user
  onEditPhase?: () => void;
  onManageAllocations?: () => void;
  onExpiredAllocationClick?: (allocation: IndividualAllocation) => void;
  className?: string;
}

export default function PhaseStatusCard({
  phase,
  individualAllocations = [],
  showDetails = true,
  showIndividualAllocations = true,
  canManageProject = false,
  canManageAllocations = false,
  currentUserId,
  onEditPhase,
  onManageAllocations,
  onExpiredAllocationClick,
  className = ''
}: PhaseStatusCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Check if phase is locked (past end date)
  const phaseLocked = isPhaseLocked(phase);
  const canEdit = !phaseLocked;

  // Determine if description is long (more than 150 characters)
  const isLongDescription = phase.description && phase.description.length > 150;
  const descriptionToShow = isLongDescription && !isDescriptionExpanded
    ? phase.description!.substring(0, 150) + '...'
    : phase.description;

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
      approvalStatus: allocation.approvalStatus,
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

  // Check pending and rejected allocations
  const pendingAllocations = phase.allocations?.filter(allocation => allocation.approvalStatus === 'PENDING') || [];
  const rejectedAllocations = phase.allocations?.filter(allocation => allocation.approvalStatus === 'REJECTED') || [];
  const expiredAllocations = phase.allocations?.filter(allocation => allocation.approvalStatus === 'EXPIRED') || [];
  const forfeitedAllocations = phase.allocations?.filter(allocation => allocation.approvalStatus === 'FORFEITED') || [];
  const hasPendingApprovals = pendingAllocations.length > 0;
  const hasRejectedAllocations = rejectedAllocations.length > 0;
  const hasExpiredAllocations = expiredAllocations.length > 0;
  const hasForfeitedAllocations = forfeitedAllocations.length > 0;
  const needsAttention = hasPendingApprovals || hasRejectedAllocations || hasExpiredAllocations;

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
        return <FaClock className={`${size} text-muted-foreground`} />;
    }
  };

  const totalAllocatedHours = phaseStatus.details.planning.totalAllocatedHours;
  const totalDistributedHours = phaseStatus.details.planning.totalDistributedHours;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border-l-4 shadow-md ${className}`}
         style={{ borderLeftColor: phaseStatus.color === 'green' ? '#10B981' :
                                   phaseStatus.color === 'red' ? '#EF4444' :
                                   phaseStatus.color === 'blue' ? '#3B82F6' :
                                   phaseStatus.color === 'purple' ? '#8B5CF6' :
                                   phaseStatus.color === 'yellow' ? '#F59E0B' : '#6B7280' }}>

      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{phase.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(new Date(phase.startDate))} - {formatDate(new Date(phase.endDate))}
            </p>
          </div>

          <div className="flex items-center gap-3 ml-4">
            {/* Total Hours Summary */}
            <div className="text-right text-sm">
              <div className="font-medium text-foreground">{formatHours(totalAllocatedHours)} allocated</div>
              <div className="text-muted-foreground">{formatHours(totalDistributedHours)} planned</div>
            </div>

            {/* Management Buttons */}
            {canManageProject && (
              <div className="flex items-center gap-2">
                {/* Lock indicator - shown when phase has ended */}
                {phaseLocked && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded" title="Phase has ended and cannot be edited">
                    <FaLock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Locked</span>
                  </div>
                )}
                {/* Edit buttons - only shown when phase is not locked */}
                {canEdit && (
                  <div className="flex items-center gap-1">
                    {onEditPhase && (
                      <button
                        onClick={onEditPhase}
                        className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                        title="Edit Phase"
                      >
                        <FaEdit />
                      </button>
                    )}
                    {canManageAllocations && onManageAllocations && (
                      <button
                        onClick={onManageAllocations}
                        className="px-3 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        Manage Hours
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {needsAttention && (
                <div className="flex flex-col gap-1">
                  {hasPendingApprovals && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-full">
                      <FaHourglassHalf className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                        {pendingAllocations.length} pending
                      </span>
                    </div>
                  )}
                  {hasRejectedAllocations && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-full">
                      <FaTimesCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">
                        {rejectedAllocations.length} rejected
                      </span>
                    </div>
                  )}
                  {hasExpiredAllocations && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-full">
                      <FaExclamationTriangle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        {expiredAllocations.length} expired
                      </span>
                    </div>
                  )}
                </div>
              )}
              {hasForfeitedAllocations && (
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full">
                  <FaTimesCircle className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {forfeitedAllocations.length} forfeited
                  </span>
                </div>
              )}
              {getStatusIcon(phaseStatus.status)}
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColorClasses(phaseStatus.color)}`}>
                {phaseStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Description - Full Width */}
        {phase.description && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Description</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {descriptionToShow}
            </p>
            {isLongDescription && (
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {isDescriptionExpanded ? (
                  <>
                    <FaChevronUp className="w-3 h-3" />
                    Show Less
                  </>
                ) : (
                  <>
                    <FaChevronDown className="w-3 h-3" />
                    Read More
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Sprint Info */}
        {phase.sprints && phase.sprints.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sprints:</span>
            <div className="flex flex-wrap gap-1">
              {phase.sprints
                .sort((a, b) => a.sprintNumber - b.sprintNumber)
                .map((sprint) => (
                  <span key={sprint.id} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
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
              <span className="font-medium text-card-foreground">Planning Progress</span>
              <span className="text-gray-600 dark:text-gray-400">
                {formatHours(totalDistributedHours)} / {formatHours(totalAllocatedHours)}
                {totalAllocatedHours > 0 && (
                  <span className="ml-1 text-xs">({phaseStatus.details.planning.completionPercentage}%)</span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
              <div className="text-xs text-muted-foreground mt-1">
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
              <span className="font-medium text-card-foreground">Work Progress</span>
              <span className="text-gray-600 dark:text-gray-400">
                {formatHours(phaseStatus.details.work.expectedCompletionByNow)} / {formatHours(phaseStatus.details.work.totalPlannedHours)}
                {phaseStatus.details.work.totalPlannedHours > 0 && (
                  <span className="ml-1 text-xs">({phaseStatus.details.work.workCompletionPercentage}%)</span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getProgressBarColor(phaseStatus.status, phaseStatus.details.overall.isOnTrack)}`}
                style={{ 
                  width: `${Math.min(phaseStatus.details.work.workCompletionPercentage, 100)}%` 
                }}
              />
            </div>
            
            {/* Current Week Progress */}
            {phaseStatus.details.work.currentWeekProgress && (
              <div className="text-xs text-muted-foreground mt-1">
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
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <h4 className="font-medium text-foreground mb-3">Individual Allocations</h4>
          <div className="space-y-2">
            {individualAllocations.map((allocation) => {
              const isOwnAllocation = currentUserId && allocation.consultantId === currentUserId;

              const isExpired = allocation.approvalStatus === 'EXPIRED';
              const isForfeited = allocation.approvalStatus === 'FORFEITED';
              const isClickable = isExpired && canManageProject && onExpiredAllocationClick;

              return (
              <div key={allocation.id}>
                <div
                  className={`relative overflow-hidden flex items-center justify-between p-3 rounded-lg ${
                    allocation.approvalStatus === 'PENDING' ? 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700' :
                    allocation.approvalStatus === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700' :
                    allocation.approvalStatus === 'EXPIRED' ? 'bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600' :
                    allocation.approvalStatus === 'FORFEITED' ? 'bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600' :
                    'bg-gray-50 dark:bg-gray-700/50 border border-transparent dark:border-gray-600'
                  } ${isOwnAllocation ? 'hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400 transition-all' : ''} ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-yellow-500 dark:hover:ring-yellow-400 transition-all' : ''}`}
                  onClick={isClickable ? () => onExpiredAllocationClick!(allocation) : undefined}
                >
                  {/* Diagonal stripes for pending/rejected/expired allocations */}
                  {allocation.approvalStatus === 'PENDING' && (
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                         style={{
                           backgroundImage: `repeating-linear-gradient(
                             45deg,
                             transparent,
                             transparent 8px,
                             rgba(249, 115, 22, 0.3) 8px,
                             rgba(249, 115, 22, 0.3) 16px
                           )`
                         }}>
                    </div>
                  )}
                  {allocation.approvalStatus === 'REJECTED' && (
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                         style={{
                           backgroundImage: `repeating-linear-gradient(
                             45deg,
                             transparent,
                             transparent 8px,
                             rgba(239, 68, 68, 0.3) 8px,
                             rgba(239, 68, 68, 0.3) 16px
                           )`
                         }}>
                    </div>
                  )}
                  {allocation.approvalStatus === 'EXPIRED' && (
                    <div className="absolute inset-0 pointer-events-none opacity-30"
                         style={{
                           backgroundImage: `repeating-linear-gradient(
                             45deg,
                             transparent,
                             transparent 8px,
                             rgba(107, 114, 128, 0.4) 8px,
                             rgba(107, 114, 128, 0.4) 16px
                           )`
                         }}>
                    </div>
                  )}

                  <div className="flex items-center gap-3 relative z-10">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${generateColorFromString(allocation.consultantId)}`}>
                      {allocation.consultantName}
                    </span>
                    {allocation.approvalStatus === 'PENDING' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-200 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 rounded-full text-xs font-medium">
                        <FaHourglassHalf className="w-2 h-2" />
                        Pending
                      </span>
                    )}
                    {allocation.approvalStatus === 'REJECTED' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 rounded-full text-xs font-medium">
                        <FaTimesCircle className="w-2 h-2" />
                        Rejected
                      </span>
                    )}
                    {allocation.approvalStatus === 'EXPIRED' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium">
                        <FaExclamationTriangle className="w-2 h-2" />
                        Expired - Click to Handle
                      </span>
                    )}
                    {allocation.approvalStatus === 'FORFEITED' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-300 rounded-full text-xs font-medium">
                        <FaTimesCircle className="w-2 h-2" />
                        Forfeited
                      </span>
                    )}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatHours(allocation.hours)} allocated
                    </div>
                  </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{formatHours(allocation.plannedHours)} planned</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span className="text-gray-600 dark:text-gray-400">{formatHours(allocation.hours - allocation.plannedHours)} remaining</span>
                  </div>

                  {/* Plan Hours Button - Only show for own allocations */}
                  {isOwnAllocation && allocation.approvalStatus === 'APPROVED' && (
                    <Link
                      href={`/dashboard/weekly-planner?phaseAllocationId=${allocation.id}`}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
                    >
                      <FaExternalLinkAlt className="w-3 h-3" />
                      Plan Hours
                    </Link>
                  )}

                  {/* Circular Progress Indicator */}
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 40 40">
                      {/* Background circle */}
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        className={allocation.plannedHours >= allocation.hours ? "text-green-500" : "text-blue-500"}
                        strokeDasharray={`${Math.PI * 32}`}
                        strokeDashoffset={`${Math.PI * 32 * (1 - Math.min(1, allocation.plannedHours / Math.max(allocation.hours, 1)))}`}
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                      />
                    </svg>
                    {/* Percentage text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[8px] font-medium text-card-foreground">
                        {Math.round((allocation.plannedHours / Math.max(allocation.hours, 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejection Reason */}
              {allocation.approvalStatus === 'REJECTED' && allocation.rejectionReason && (
                <div className="ml-3 mt-1 p-2 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-400 dark:border-red-600 rounded text-xs">
                  <span className="font-semibold text-red-800 dark:text-red-300">Rejection Reason: </span>
                  <span className="text-red-700 dark:text-red-400">{allocation.rejectionReason}</span>
                </div>
              )}
            </div>
            );
            })}
          </div>

          {/* Timeline & Status Info */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>Timeline: {phaseStatus.details.time.status === 'future' ? 'Upcoming' :
                                phaseStatus.details.time.status === 'active' ? 'Active' : 'Past'}</span>
                {phaseStatus.details.time.status === 'active' && (
                  <span>{phaseStatus.details.time.timeElapsedPercentage}% time elapsed</span>
                )}
              </div>
              <span className={`font-medium ${
                phaseStatus.details.overall.riskLevel === 'high' ? 'text-red-600 dark:text-red-400' :
                phaseStatus.details.overall.riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
              }`}>
                Risk: {phaseStatus.details.overall.riskLevel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* No Allocations Message */}
      {showIndividualAllocations && individualAllocations.length === 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-center py-6">
            <div className="text-muted-foreground mb-2">No resource allocations yet</div>
            {canManageAllocations && onManageAllocations && (
              <button
                onClick={onManageAllocations}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
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