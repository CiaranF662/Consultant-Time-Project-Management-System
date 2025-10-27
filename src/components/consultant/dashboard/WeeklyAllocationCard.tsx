import { FaTimes, FaCheck, FaClock, FaLock } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';

interface WeekData {
  weekNumber: number;
  year: number;
  label: string;
}

interface WeeklyAllocation {
  id: string;
  weekNumber: number;
  year: number;
  proposedHours?: number | null;
  approvedHours?: number | null;
  planningStatus: 'PENDING' | 'APPROVED' | 'MODIFIED' | 'REJECTED';
  rejectionReason?: string | null;
  weekStartDate: Date;
  weekEndDate: Date;
}

interface OtherPhase {
  phaseId: string;
  phaseName: string;
  projectTitle: string;
  hours: number;
  projectColor: string;
}

interface WeeklyAllocationCardProps {
  week: WeekData;
  phaseAllocationId: string;
  currentHours: number;
  hasUnsavedChanges: boolean;
  error?: string;
  warning?: string;
  weeklyAllocation?: WeeklyAllocation;
  localStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
  otherPhases: OtherPhase[];
  onHourChange: (value: string) => void;
  isWeekLocked?: boolean; // Week has passed and cannot be edited
}

export default function WeeklyAllocationCard({
  week,
  phaseAllocationId,
  currentHours,
  hasUnsavedChanges,
  error,
  warning,
  weeklyAllocation,
  localStatus,
  otherPhases,
  onHourChange,
  isWeekLocked = false
}: WeeklyAllocationCardProps) {
  const planningStatus = localStatus || weeklyAllocation?.planningStatus;
  const isRejected = planningStatus === 'REJECTED';
  const isApproved = planningStatus === 'APPROVED' || planningStatus === 'MODIFIED';
  const isPending = planningStatus === 'PENDING';
  const rejectionReason = weeklyAllocation?.rejectionReason;

  return (
    <div className={`border rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 ${
      isWeekLocked ? 'border-gray-400 dark:border-gray-600 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 opacity-75' :
      isRejected ? 'border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20' :
      isApproved ? 'border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20' :
      isPending ? 'border-orange-300 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20' :
      'border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800'
    }`}>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-foreground">
            {week.label}
          </div>
          {/* Enhanced Status indicator */}
          {isWeekLocked && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-full">
              <FaLock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Week Ended</span>
            </div>
          )}
          {!isWeekLocked && isRejected && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-full">
              <FaTimes className="w-3 h-3 text-red-600 dark:text-red-400" />
              <span className="text-xs font-bold text-red-800 dark:text-red-200">Rejected</span>
            </div>
          )}
          {!isWeekLocked && isApproved && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 rounded-full">
              <FaCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                {planningStatus === 'MODIFIED' ? 'Modified' : 'Approved'}
              </span>
            </div>
          )}
          {!isWeekLocked && isPending && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700 rounded-full">
              <FaClock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-bold text-orange-800 dark:text-orange-200">Pending</span>
            </div>
          )}
        </div>

        {/* Status details */}
        {isRejected && (
          <>
            {rejectionReason && (
              <div className="mt-1 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
                <strong>Reason:</strong> {rejectionReason}
              </div>
            )}
            {weeklyAllocation && weeklyAllocation.approvedHours !== null && weeklyAllocation.approvedHours !== undefined && weeklyAllocation.approvedHours > 0 && (
              <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-card-foreground border border-gray-200 dark:border-gray-700">
                <strong>Originally approved for:</strong> {formatHours(weeklyAllocation.approvedHours)}
              </div>
            )}
          </>
        )}
        {isApproved && weeklyAllocation && (
          <div className="mt-1 p-2 bg-green-100 dark:bg-green-900/40 rounded text-xs text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
            <strong>
              {planningStatus === 'MODIFIED' ? 'Modified to:' : 'Approved for:'}
            </strong> {formatHours(weeklyAllocation.approvedHours || 0)}
            {planningStatus === 'MODIFIED' && weeklyAllocation.proposedHours !== weeklyAllocation.approvedHours && (
              <span className="text-green-600 dark:text-green-400"> (was {formatHours(weeklyAllocation.proposedHours || 0)})</span>
            )}
          </div>
        )}
        {isPending && weeklyAllocation && currentHours > 0 && (
          <div className="mt-1 p-2 bg-orange-100 dark:bg-orange-900/40 rounded text-xs text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
            <strong>Awaiting approval for:</strong> {formatHours(weeklyAllocation.proposedHours || 0)}
          </div>
        )}
      </div>

      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.5"
          value={currentHours || ''}
          onChange={(e) => onHourChange(e.target.value)}
          disabled={isWeekLocked}
          className={`block w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 font-medium ${
            isWeekLocked ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' :
            error ? 'border-red-300 dark:border-red-700 focus:ring-red-500 bg-red-50 dark:bg-red-900/20 text-foreground' :
            warning ? 'border-amber-300 dark:border-amber-700 focus:ring-amber-500 bg-amber-50 dark:bg-amber-900/20 text-foreground' :
            hasUnsavedChanges ? 'border-yellow-300 dark:border-yellow-700 focus:ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-foreground' :
            isRejected ? 'border-red-300 dark:border-red-700 focus:ring-red-500 bg-white dark:bg-gray-900 text-foreground' :
            isApproved ? 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-foreground' :
            isPending ? 'border-orange-300 dark:border-orange-700 focus:ring-orange-500 bg-orange-50 dark:bg-orange-900/20 text-foreground' :
            'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-800 text-foreground'
          }`}
          placeholder={isWeekLocked ? "Week has ended" : isRejected ? "Enter new hours" : "Enter hours"}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-muted-foreground">
          hrs
        </div>
      </div>

      {/* Enhanced other phases section */}
      {otherPhases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Other work this week</span>
          </div>
          <div className="space-y-1">
            {otherPhases.map((phase) => (
              <div
                key={phase.phaseId}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: phase.projectColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {phase.projectTitle}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {phase.phaseName}
                  </div>
                </div>
                <span className="text-xs font-bold text-card-foreground bg-white dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  {formatHours(phase.hours)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {otherPhases.length === 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-muted-foreground text-center py-2">
            No other work scheduled
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && warning && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{warning}</p>
      )}

      {hasUnsavedChanges && !error && !warning && (
        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">Unsaved</p>
      )}
    </div>
  );
}