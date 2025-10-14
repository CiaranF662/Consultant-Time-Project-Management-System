'use client';

import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaClock, FaExternalLinkAlt, FaChartBar } from 'react-icons/fa';
import Link from 'next/link';

interface ProjectPlanningCardProps {
  project: {
    id: string;
    title: string;
    description?: string | null;
  };
  totalPhases: number;
  phasesFullyPlanned: number; // Phases with 100% hours distributed AND approved
  totalAllocatedHours: number;
  totalPlannedHours: number;
  completionPercentage: number;
  nearestDeadline?: Date;
  earliestStartDate?: Date; // Earliest phase start date
  approvalStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  weeklyStatus: {
    pendingWeeks: number;
    approvedWeeks: number;
    rejectedWeeks: number;
    modifiedWeeks: number;
  };
  hasUrgentUnplannedPhase?: boolean; // True if any phase that started or starts within 7 days is unplanned
  isExpanded: boolean;
  onClick: () => void;
}

export default function ProjectPlanningCard({
  project,
  totalPhases,
  phasesFullyPlanned,
  totalAllocatedHours,
  totalPlannedHours,
  completionPercentage,
  nearestDeadline,
  earliestStartDate,
  approvalStatus,
  weeklyStatus,
  hasUrgentUnplannedPhase = false,
  isExpanded,
  onClick
}: ProjectPlanningCardProps) {
  const remainingHours = totalAllocatedHours - totalPlannedHours;

  // Check if all phases have actually ended (not just planning complete)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allPhasesEnded = nearestDeadline ? new Date(nearestDeadline).setHours(0, 0, 0, 0) < today.getTime() : false;

  // Determine overall status priority
  const hasRejections = approvalStatus.rejected > 0 || weeklyStatus.rejectedWeeks > 0;
  const hasModifications = weeklyStatus.modifiedWeeks > 0;
  const hasPending = approvalStatus.pending > 0 || weeklyStatus.pendingWeeks > 0;
  const isPlanningComplete = completionPercentage >= 100 && !hasPending && !hasRejections;
  const isFullyComplete = isPlanningComplete && allPhasesEnded; // Both planning done AND timeline ended
  const isInProgress = completionPercentage > 0 && completionPercentage < 100;

  // Determine card border color (most important status)
  let borderColor = 'border-gray-300 dark:border-gray-600'; // Default
  if (hasRejections) {
    borderColor = 'border-red-400 dark:border-red-600';
  } else if (hasModifications) {
    borderColor = 'border-yellow-400 dark:border-yellow-600';
  } else if (hasPending) {
    borderColor = 'border-amber-400 dark:border-amber-600';
  } else if (isPlanningComplete) {
    borderColor = 'border-green-400 dark:border-green-600';
  } else if (isInProgress) {
    borderColor = 'border-blue-400 dark:border-blue-600';
  }

  // Calculate project timeline status (considering all phases)
  let deadlineInfo = null;
  if (nearestDeadline && earliestStartDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectStartDate = new Date(earliestStartDate);
    projectStartDate.setHours(0, 0, 0, 0);

    const projectEndDate = new Date(nearestDeadline);
    projectEndDate.setHours(0, 0, 0, 0);

    const hasProjectStarted = projectStartDate.getTime() <= today.getTime();
    const hasProjectEnded = projectEndDate.getTime() < today.getTime();
    const daysUntilStart = Math.ceil((projectStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.ceil((projectEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let text = '';
    let isUrgent = false;
    let isActive = false;

    // Priority 1: Check if ALL phases have ended (project timeline is complete)
    if (hasProjectEnded) {
      // Only show "All phases completed" if the project has ended AND all planning is done
      if (isFullyComplete) {
        text = 'All phases completed';
        isActive = false;
      } else {
        // Project ended but planning not complete = overdue
        text = `${Math.abs(daysUntilEnd)}d overdue`;
        isUrgent = true;
      }
    }
    // Priority 2: Check if project is in progress (started but not all phases ended)
    else if (hasProjectStarted) {
      text = 'In Progress';
      isActive = true;
    }
    // Priority 3: Project hasn't started yet
    else if (daysUntilStart === 0) {
      text = 'Starts today';
      isUrgent = true;
    } else if (daysUntilStart === 1) {
      text = 'Starts tomorrow';
      isUrgent = true;
    } else if (daysUntilStart <= 7) {
      text = `Starts in ${daysUntilStart}d`;
      isUrgent = true;
    } else if (daysUntilStart <= 14) {
      text = `Starts in ${daysUntilStart}d`;
    } else {
      text = `Starts in ${Math.ceil(daysUntilStart / 7)}w`;
    }

    if (text) {
      deadlineInfo = { text, isUrgent, isActive };
    }
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-xl border-2 transition-all duration-200 cursor-pointer
        bg-white dark:bg-gray-800
        ${borderColor}
        ${isExpanded ? 'ring-4 ring-blue-500/20' : 'hover:shadow-xl hover:-translate-y-0.5'}
        overflow-hidden
      `}
    >
      <div className="p-6">
        {/* Header: Project Name + Link */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="font-bold text-xl text-foreground leading-tight flex-1" title={project.title}>
            {project.title}
          </h3>
          <Link
            href={`/dashboard/projects/${project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
            title="View Project"
          >
            <FaExternalLinkAlt className="w-4 h-4" />
          </Link>
        </div>

        {/* Main Progress Bar with Percentage */}
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Planning Progress</span>
            <span className="text-2xl font-bold text-foreground">{Math.round(completionPercentage)}%</span>
          </div>
          <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isPlanningComplete
                  ? 'bg-green-500'
                  : completionPercentage >= 75
                  ? 'bg-blue-500'
                  : completionPercentage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Hours Stats */}
          <div className="text-sm">
            <div className="text-gray-500 dark:text-gray-400 mb-1">Hours</div>
            <div className="font-semibold text-foreground">
              {totalPlannedHours}<span className="text-gray-400">/{totalAllocatedHours}h</span>
            </div>
          </div>

          {/* Phases Stats */}
          <div className="text-sm">
            <div className="text-gray-500 dark:text-gray-400 mb-1">Phases</div>
            <div className="font-semibold text-foreground">
              {phasesFullyPlanned}<span className="text-gray-400">/{totalPhases}</span>
            </div>
          </div>
        </div>

        {/* Project Timeline */}
        {earliestStartDate && nearestDeadline && (
          <div className="mb-4 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {new Date(earliestStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="mx-1.5">→</span>
              {new Date(nearestDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}

        {/* Status Badges Row */}
        <div className="flex flex-wrap gap-2 min-h-[28px]">
          {/* Urgent Planning Required Badge - Shows when any phase that started or starts within 7 days is unplanned */}
          {hasUrgentUnplannedPhase && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-300 dark:border-red-700 animate-pulse">
              <FaExclamationTriangle className="w-3 h-3" />
              Urgent: Plan hours now
            </span>
          )}

          {/* Remaining Hours Badge */}
          {!isPlanningComplete && remainingHours > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              {remainingHours}h to plan
            </span>
          )}

          {/* Planning Complete Badge */}
          {isPlanningComplete && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              <FaCheckCircle className="w-3 h-3" />
              Planning Complete
            </span>
          )}

          {/* Deadline Badge */}
          {deadlineInfo && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              deadlineInfo.isActive
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : deadlineInfo.isUrgent
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              <FaClock className="w-3 h-3" />
              {deadlineInfo.text}
            </span>
          )}

          {/* Phase Allocation Pending Badge */}
          {approvalStatus.pending > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              <span className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse"></span>
              {approvalStatus.pending} phase{approvalStatus.pending !== 1 ? 's' : ''} pending
            </span>
          )}

          {/* Phase Allocation Rejected Badge */}
          {approvalStatus.rejected > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              <FaExclamationTriangle className="w-3 h-3" />
              {approvalStatus.rejected} phase{approvalStatus.rejected !== 1 ? 's' : ''} rejected
            </span>
          )}

          {/* Weekly Status Badges */}
          {weeklyStatus.pendingWeeks > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
              <span className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-pulse"></span>
              {weeklyStatus.pendingWeeks} week{weeklyStatus.pendingWeeks !== 1 ? 's' : ''} pending
            </span>
          )}

          {weeklyStatus.rejectedWeeks > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              <FaExclamationTriangle className="w-3 h-3" />
              {weeklyStatus.rejectedWeeks} week{weeklyStatus.rejectedWeeks !== 1 ? 's' : ''} rejected
            </span>
          )}

          {weeklyStatus.modifiedWeeks > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              <FaCheckCircle className="w-3 h-3" />
              {weeklyStatus.modifiedWeeks} week{weeklyStatus.modifiedWeeks !== 1 ? 's' : ''} modified
            </span>
          )}

          {/* Always show approved weeks count to indicate approval progress */}
          {weeklyStatus.approvedWeeks > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              <FaCheckCircle className="w-3 h-3" />
              {weeklyStatus.approvedWeeks} week{weeklyStatus.approvedWeeks !== 1 ? 's' : ''} approved
            </span>
          )}
        </div>

        {/* Call to Action */}
        {!isExpanded && (
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <FaChartBar className="w-4 h-4" />
              Click to plan hours
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
