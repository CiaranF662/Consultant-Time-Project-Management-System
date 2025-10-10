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
  phasesFullyPlanned: number; // Phases with 100% hours distributed
  totalAllocatedHours: number;
  totalPlannedHours: number;
  completionPercentage: number;
  nearestDeadline?: Date;
  approvalStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
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
  approvalStatus,
  isExpanded,
  onClick
}: ProjectPlanningCardProps) {
  const remainingHours = totalAllocatedHours - totalPlannedHours;

  // Determine overall status priority
  const hasRejections = approvalStatus.rejected > 0;
  const isComplete = completionPercentage >= 100;
  const isInProgress = completionPercentage > 0 && completionPercentage < 100;

  // Determine card border color (most important status)
  let borderColor = 'border-gray-300 dark:border-gray-600'; // Default
  if (hasRejections) {
    borderColor = 'border-red-400 dark:border-red-600';
  } else if (isComplete) {
    borderColor = 'border-green-400 dark:border-green-600';
  } else if (isInProgress) {
    borderColor = 'border-blue-400 dark:border-blue-600';
  }

  // Calculate days until deadline
  let deadlineInfo = null;
  if (nearestDeadline) {
    const today = new Date();
    const deadline = new Date(nearestDeadline);
    const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let text = '';
    let isUrgent = false;

    if (daysUntil < 0) {
      text = `${Math.abs(daysUntil)}d overdue`;
      isUrgent = true;
    } else if (daysUntil === 0) {
      text = 'Due today';
      isUrgent = true;
    } else if (daysUntil === 1) {
      text = 'Due tomorrow';
      isUrgent = true;
    } else if (daysUntil <= 7) {
      text = `${daysUntil}d left`;
      isUrgent = true;
    } else if (daysUntil <= 14) {
      text = `${daysUntil}d left`;
    } else {
      text = `${Math.ceil(daysUntil / 7)}w left`;
    }

    deadlineInfo = { text, isUrgent };
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
                isComplete
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

        {/* Status Badges Row */}
        <div className="flex flex-wrap gap-2 min-h-[28px]">
          {/* Remaining Hours Badge */}
          {!isComplete && remainingHours > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
              {remainingHours}h to plan
            </span>
          )}

          {/* Complete Badge */}
          {isComplete && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              <FaCheckCircle className="w-3 h-3" />
              Complete
            </span>
          )}

          {/* Deadline Badge */}
          {deadlineInfo && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              deadlineInfo.isUrgent
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              <FaClock className="w-3 h-3" />
              {deadlineInfo.text}
            </span>
          )}

          {/* Pending Approvals Badge */}
          {approvalStatus.pending > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {approvalStatus.pending} pending
            </span>
          )}

          {/* Rejected Badge */}
          {hasRejections && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
              <FaExclamationTriangle className="w-3 h-3" />
              {approvalStatus.rejected} rejected
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
