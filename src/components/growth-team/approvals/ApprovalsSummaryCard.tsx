'use client';

import Link from 'next/link';
import { FaCheckCircle, FaClock, FaExclamationCircle } from 'react-icons/fa';
import { useEffect, useState } from 'react';

interface ApprovalsSummary {
  pendingPhaseAllocations: number;
  pendingWeeklyPlans: number;
  pendingHourChanges: number;
  totalPending: number;
}

export default function ApprovalsSummaryCard() {
  const [summary, setSummary] = useState<ApprovalsSummary>({
    pendingPhaseAllocations: 0,
    pendingWeeklyPlans: 0,
    pendingHourChanges: 0,
    totalPending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/approvals/summary');
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch (error) {
      }
      setLoading(false);
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/dashboard/hour-approvals"
      className="block bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
          <p className="text-2xl font-bold text-foreground">{summary.totalPending}</p>
          {summary.totalPending > 0 && (
            <div className="mt-2 space-y-1">
              {summary.pendingPhaseAllocations > 0 && (
                <p className="text-xs text-muted-foreground">
                  {summary.pendingPhaseAllocations} phase allocation{summary.pendingPhaseAllocations !== 1 ? 's' : ''}
                </p>
              )}
              {summary.pendingWeeklyPlans > 0 && (
                <p className="text-xs text-muted-foreground">
                  {summary.pendingWeeklyPlans} weekly plan{summary.pendingWeeklyPlans !== 1 ? 's' : ''}
                </p>
              )}
              {summary.pendingHourChanges > 0 && (
                <p className="text-xs text-muted-foreground">
                  {summary.pendingHourChanges} hour change{summary.pendingHourChanges !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center">
          {summary.totalPending > 0 ? (
            <FaExclamationCircle className="h-8 w-8 text-orange-500 dark:text-orange-400" />
          ) : (
            <FaCheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
          )}
        </div>
      </div>
    </Link>
  );
}