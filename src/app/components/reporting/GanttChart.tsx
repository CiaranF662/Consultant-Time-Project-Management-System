'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Calendar, Clock, Users, AlertCircle } from 'lucide-react';

//#region Types
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  type?: 'task' | 'milestone' | 'project';
}

interface GanttChartProps {
  tasks: GanttTask[];
  title: string;
  viewMode?: 'day' | 'week' | 'month';
  showAssignees?: boolean;
  showProgress?: boolean;
  className?: string;
}
//#endregion

export default function GanttChart({
  tasks,
  title,
  viewMode = 'week',
  showAssignees = true,
  showProgress = true,
  className = ''
}: GanttChartProps) {
  //#region State & Refs
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const ganttRef = useRef<HTMLDivElement>(null);
  //#endregion

  //#region Timeline Calculations
  const timelineBounds = useMemo(() => {
    if (!tasks.length) return { start: new Date(), end: new Date() };

    const allDates = tasks.flatMap(task => [task.start, task.end]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  }, [tasks]);

  const generateTimeColumns = useMemo(() => {
    const columns: Date[] = [];
    const current = new Date(timelineBounds.start);

    while (current <= timelineBounds.end) {
      columns.push(new Date(current));
      switch (currentViewMode) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return columns;
  }, [timelineBounds, currentViewMode]);

  const getTaskPosition = (task: GanttTask) => {
    const totalDuration = timelineBounds.end.getTime() - timelineBounds.start.getTime();
    const left = ((task.start.getTime() - timelineBounds.start.getTime()) / totalDuration) * 100;
    const width = ((task.end.getTime() - task.start.getTime()) / totalDuration) * 100;
    return { left, width: Math.max(width, 1) };
  };

  const formatDate = (date: Date) => {
    switch (currentViewMode) {
      case 'day':
      case 'week':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  };
  //#endregion

  //#region Helpers
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <AlertCircle className="w-3 h-3" />;
      case 'project': return <Users className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };
  //#endregion

  //#region Components
  const Header = () => (
    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">{tasks.length} tasks</p>
      </div>
      <div className="inline-flex bg-gray-100 rounded-lg p-1">
        {['day', 'week', 'month'].map(mode => (
          <button
            key={mode}
            onClick={() => setCurrentViewMode(mode as any)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentViewMode === mode
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  const TimelineHeader = () => (
    <div className="border-b border-gray-200 bg-gray-50 flex">
      <div className="w-80 px-4 py-3 font-medium text-gray-700 border-r border-gray-200">
        Task Name
      </div>
      <div className="flex-1 relative">
        <div className="flex h-12 items-center">
          {generateTimeColumns.map((date, index) => (
            <div
              key={index}
              className="flex-1 text-center text-xs text-gray-600 border-r border-gray-200 px-2"
            >
              {formatDate(date)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TaskRow = ({ task }: { task: GanttTask }) => {
    const position = getTaskPosition(task);
    return (
      <div className="flex hover:bg-gray-50">
        {/* Task Info */}
        <div className="w-80 px-4 py-3 border-r border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority || 'medium')}`} />
            <span className="flex items-center gap-1 text-gray-600">
              {getTaskTypeIcon(task.type || 'task')}
            </span>
            <span className="font-medium text-gray-800 truncate">{task.name}</span>
          </div>
          {showAssignees && task.assignee && (
            <div className="text-xs text-gray-500 mt-1">Assigned to: {task.assignee}</div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 relative py-3">
          <div className="relative h-6">
            <div
              className={`absolute h-6 rounded-md shadow-sm ${getPriorityColor(task.priority || 'medium')} opacity-80`}
              style={{ left: `${position.left}%`, width: `${position.width}%` }}
            >
              {showProgress && (
                <div
                  className="h-full bg-white bg-opacity-30 rounded-md"
                  style={{ width: `${task.progress}%` }}
                />
              )}
            </div>

            {task.type === 'milestone' && (
              <div
                className="absolute w-4 h-4 bg-orange-500 transform rotate-45 -translate-y-1"
                style={{ left: `${position.left}%` }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const Legend = () => (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
      <div className="flex items-center gap-4">
        <PriorityLegend color="bg-red-500" label="High Priority" />
        <PriorityLegend color="bg-yellow-500" label="Medium Priority" />
        <PriorityLegend color="bg-green-500" label="Low Priority" />
        <PriorityLegend color="bg-orange-500" label="Milestone" isMilestone />
      </div>
      {showProgress && <div className="text-gray-500">Progress shown as lighter overlay</div>}
    </div>
  );

  const PriorityLegend = ({ color, label, isMilestone }: { color: string; label: string; isMilestone?: boolean }) => (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 ${color} ${isMilestone ? 'transform rotate-45' : ''} rounded-full`} />
      <span className="text-gray-600">{label}</span>
    </div>
  );
  //#endregion

  //#region Render
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      <Header />
      <div className="overflow-x-auto">
        <div className="min-w-[800px]" ref={ganttRef}>
          <TimelineHeader />
          <div className="divide-y divide-gray-200">
            {tasks.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        </div>
      </div>
      <Legend />
    </div>
  );
  //#endregion
}
