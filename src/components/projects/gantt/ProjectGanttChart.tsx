'use client';

import React, { useState } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { FaCalendarAlt, FaCalendarWeek, FaCalendar, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
}

interface PhaseAllocation {
  consultantId: string;
  consultantName: string;
  hours: number;
}

interface Phase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  sprints: Sprint[];
  allocations?: PhaseAllocation[];
}

interface ProjectGanttChartProps {
  project: {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date | null;
    phases: Phase[];
  };
}

export default function ProjectGanttChart({ project }: ProjectGanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [zoomLevel, setZoomLevel] = useState(1);

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const getColumnWidth = () => {
    const baseWidth = viewMode === ViewMode.Year ? 600 : viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 100 : 30;
    // Ensure minimum width to maintain scroll functionality at low zoom levels
    return Math.max(Math.round(baseWidth * zoomLevel), 30);
  };

  // Calculate phase progress based on time elapsed
  const calculatePhaseProgress = React.useCallback((phase: Phase): number => {
    const phaseStart = new Date(phase.startDate);
    const phaseEnd = new Date(phase.endDate);
    const today = new Date();

    if (today < phaseStart) return 0;
    if (today > phaseEnd) return 100;

    const totalDuration = phaseEnd.getTime() - phaseStart.getTime();
    const elapsedDuration = today.getTime() - phaseStart.getTime();

    return Math.round((elapsedDuration / totalDuration) * 100);
  }, []);

  // Calculate overall project progress based on phases
  const calculateProjectProgress = React.useCallback((): number => {
    if (project.phases.length === 0) return 0;

    const today = new Date();
    const projectStart = new Date(project.startDate);
    const projectEnd = project.endDate ? new Date(project.endDate) :
      new Date(Math.max(...project.phases.map(p => new Date(p.endDate).getTime())));

    if (today < projectStart) return 0;
    if (today > projectEnd) return 100;

    const totalDuration = projectEnd.getTime() - projectStart.getTime();
    const elapsedDuration = today.getTime() - projectStart.getTime();

    return Math.round((elapsedDuration / totalDuration) * 100);
  }, [JSON.stringify(project.phases), project.startDate?.toString(), project.endDate?.toString()]);

  // Get color scheme for different phase types
  const getPhaseColor = React.useCallback((phaseName: string, index: number) => {
    if (phaseName.toLowerCase().includes('kickoff') || phaseName.toLowerCase().includes('setup')) {
      return {
        background: '#34d399',
        backgroundSelected: '#10b981',
        progress: '#10b981',
        progressSelected: '#059669',
      };
    }
    if (phaseName.toLowerCase().includes('development') || phaseName.toLowerCase().includes('build')) {
      return {
        background: '#fbbf24',
        backgroundSelected: '#f59e0b',
        progress: '#f59e0b',
        progressSelected: '#d97706',
      };
    }
    if (phaseName.toLowerCase().includes('testing') || phaseName.toLowerCase().includes('qa')) {
      return {
        background: '#f87171',
        backgroundSelected: '#ef4444',
        progress: '#ef4444',
        progressSelected: '#dc2626',
      };
    }
    // Default colors based on index for variety
    const colors = [
      { bg: '#a78bfa', bgSel: '#8b5cf6', prog: '#8b5cf6', progSel: '#7c3aed' },
      { bg: '#06b6d4', bgSel: '#0891b2', prog: '#0e7490', progSel: '#155e75' },
      { bg: '#84cc16', bgSel: '#65a30d', prog: '#4d7c0f', progSel: '#365314' },
      { bg: '#f97316', bgSel: '#ea580c', prog: '#c2410c', progSel: '#9a3412' },
    ];

    const colorSet = colors[index % colors.length];
    return {
      background: colorSet.bg,
      backgroundSelected: colorSet.bgSel,
      progress: colorSet.prog,
      progressSelected: colorSet.progSel,
    };
  }, []);

  // Transform project phases into Gantt chart format
  const transformProjectToTasks = React.useMemo((): Task[] => {
    const tasks: Task[] = [];

    // Add the main project as the first task for comparison
    const projectStart = new Date(project.startDate);
    const projectEnd = project.endDate ? new Date(project.endDate) :
      new Date(Math.max(...project.phases.map(p => new Date(p.endDate).getTime())));

    const projectTask: Task = {
      start: projectStart,
      end: projectEnd,
      name: project.title,
      id: `project-${project.id}`,
      type: 'project',
      progress: calculateProjectProgress(),
      isDisabled: false,
      styles: {
        progressColor: '#1d4ed8',
        progressSelectedColor: '#1e3a8a',
        backgroundColor: '#3b82f6',
        backgroundSelectedColor: '#2563eb',
      },
    };
    tasks.push(projectTask);

    // Add each phase as a separate task
    project.phases.forEach((phase, index) => {
      const phaseStart = new Date(phase.startDate);
      const phaseEnd = new Date(phase.endDate);
      const colors = getPhaseColor(phase.name, index);

      const phaseTask: Task = {
        start: phaseStart,
        end: phaseEnd,
        name: phase.name,
        id: `phase-${phase.id}`,
        type: 'task',
        progress: calculatePhaseProgress(phase),
        isDisabled: false,
        styles: {
          progressColor: colors.progress,
          progressSelectedColor: colors.progressSelected,
          backgroundColor: colors.background,
          backgroundSelectedColor: colors.backgroundSelected,
        },
      };
      tasks.push(phaseTask);
    });

    return tasks;
  }, [
    project.id,
    project.title,
    project.startDate?.toString(),
    project.endDate?.toString(),
    JSON.stringify(project.phases),
    calculatePhaseProgress,
    calculateProjectProgress,
    getPhaseColor
  ]);

  // Format date for display
  const formatDate = React.useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const tasks = transformProjectToTasks;

  return (
    <div className="h-full">
      {/* Custom styles for better visibility */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Light mode styles */
          .gantt-container .gantt-timeline .gantt-header {
            background-color: rgb(249 250 251) !important;
          }
          .gantt-container .gantt-timeline .gantt-header-top {
            background-color: rgb(243 244 246) !important;
            font-weight: 600 !important;
            border-bottom: 2px solid rgb(209 213 219) !important;
            font-size: ${viewMode === ViewMode.Month ? '14px' : '12px'} !important;
            color: rgb(17 24 39) !important;
          }
          .gantt-container .gantt-timeline .gantt-header-bottom {
            font-size: ${viewMode === ViewMode.Month ? '13px' : '11px'} !important;
            font-weight: 500 !important;
            color: rgb(55 65 81) !important;
          }
          .gantt-wrapper svg {
            background-color: rgb(255 255 255) !important;
          }
          .gantt-wrapper line {
            stroke: rgb(229 231 235) !important;
          }

          /* Dark mode styles - using filter inversion */
          .dark .gantt-container .gantt-timeline .gantt-header {
            background-color: rgb(31 41 55) !important;
          }
          .dark .gantt-container .gantt-timeline .gantt-header-top {
            background-color: rgb(55 65 81) !important;
            border-bottom: 2px solid rgb(75 85 99) !important;
            color: rgb(243 244 246) !important;
          }
          .dark .gantt-container .gantt-timeline .gantt-header-bottom {
            color: rgb(209 213 219) !important;
          }
          .dark .gantt-wrapper {
            background-color: rgb(17 24 39) !important;
          }
          /* When inverted, rgb(238 231 216) becomes roughly rgb(17 24 39) */
          .dark .gantt-wrapper svg {
            background-color: rgb(238 231 216) !important;
          }
          .dark .gantt-wrapper line {
            stroke: rgb(200 190 174) !important;
          }

          ${viewMode === ViewMode.Month ? `
            .gantt-container .gantt-timeline .gantt-header-top {
              height: 35px !important;
              line-height: 35px !important;
            }
          ` : ''}
        `
      }} />

      {/* View Mode Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-card-foreground">View Mode:</span>
            <div className="flex bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              {[
                { mode: ViewMode.Week, label: 'Week', icon: FaCalendarWeek },
                { mode: ViewMode.Month, label: 'Month', icon: FaCalendarAlt },
                { mode: ViewMode.Year, label: 'Year', icon: FaCalendar },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-foreground hover:shadow-sm'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-card-foreground">Zoom:</span>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              <button
                onClick={zoomOut}
                disabled={zoomLevel <= 0.5}
                className={`p-2 rounded-md transition-all duration-200 ${
                  zoomLevel <= 0.5
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-foreground hover:shadow-sm'
                }`}
                title="Zoom Out"
              >
                <FaSearchMinus className="h-3 w-3" />
              </button>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={zoomLevel >= 2}
                className={`p-2 rounded-md transition-all duration-200 ${
                  zoomLevel >= 2
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-foreground hover:shadow-sm'
                }`}
                title="Zoom In"
              >
                <FaSearchPlus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          1 project • {project.phases.length} phase{project.phases.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Gantt Chart */}
      <div
        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
        style={{
          height: (project.phases.length + 1) <= 12
            ? `${Math.max((project.phases.length + 1) * 50 + 100, 250)}px`
            : 'calc(100vh - 300px)',
          minHeight: '250px',
          maxHeight: 'calc(100vh - 300px)'
        }}
      >
        {tasks.length > 0 ? (
          <div className="gantt-wrapper h-full dark:[&_svg]:invert dark:[&_svg]:hue-rotate-180">
            <Gantt
            tasks={tasks}
            viewMode={viewMode}
            columnWidth={getColumnWidth()}
            rowHeight={50}
            barBackgroundColor="#3b82f6"
            barBackgroundSelectedColor="#2563eb"
            barProgressColor="#1e40af"
            barProgressSelectedColor="#1d4ed8"
            projectBackgroundColor="#3b82f6"
            projectBackgroundSelectedColor="#2563eb"
            projectProgressColor="#1e40af"
            projectProgressSelectedColor="#1d4ed8"
            milestoneBackgroundColor="#10b981"
            milestoneBackgroundSelectedColor="#059669"
            fontSize="14"
            fontFamily="Inter, system-ui, sans-serif"
            todayColor="#ef444430"
            listCellWidth="200px"
            preStepsCount={1}
            headerHeight={viewMode === ViewMode.Month ? 80 : 50}
            locale="en-US"
            TaskListHeader={() => (
              <div
                className="font-bold text-foreground bg-gray-200 dark:bg-gray-700 border-r-2 border-gray-400 dark:border-gray-600 px-3 py-3 text-center"
                style={{
                  height: viewMode === ViewMode.Month ? '80px' : '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Project & Phases
              </div>
            )}
            TaskListTable={({ tasks }) => (
              <div className="bg-gray-50 dark:bg-gray-800 border-r-2 border-gray-300 dark:border-gray-600">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`px-4 border-b border-gray-200 dark:border-gray-700 text-sm overflow-hidden transition-colors ${
                      task.type === 'project'
                        ? 'font-bold text-foreground bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 dark:border-blue-400'
                        : 'font-semibold text-foreground bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 pl-8'
                    }`}
                    style={{
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '50px',
                      maxHeight: '50px'
                    }}
                    title={task.name}
                  >
                    <div className="truncate w-full">
                      {task.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            TooltipContent={({ task }) => {
              const isProject = task.type === 'project';
              const phase = isProject ? null : project.phases.find(p => `phase-${p.id}` === task.id);
              const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24));
              const allocations = phase?.allocations || [];
              const totalAllocatedHours = allocations.reduce((sum, allocation) => sum + allocation.hours, 0);

              // Project-level calculations
              const totalProjectHours = isProject ?
                project.phases.reduce((sum, p) => sum + (p.allocations?.reduce((pSum, a) => pSum + a.hours, 0) || 0), 0) : 0;

              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-80">
                  <div className="font-bold text-foreground mb-3 text-lg truncate" title={task.name}>
                    {task.name}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="text-sm font-semibold text-foreground">
                        {isProject ? 'Project Overview' : 'Phase'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Start Date:</span>
                      <span className="text-sm font-semibold text-foreground">{formatDate(task.start)}</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">End Date:</span>
                      <span className="text-sm font-semibold text-foreground">{formatDate(task.end)}</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration:</span>
                      <span className="text-sm font-semibold text-foreground">{duration} days</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress:</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{task.progress}%</span>
                    </div>

                    {isProject ? (
                      <>
                        <div className="flex justify-between items-center min-h-[20px]">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Phases:</span>
                          <span className="text-sm font-semibold text-foreground">
                            {project.phases.length} phase{project.phases.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center min-h-[20px]">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Budget:</span>
                          <span className="text-sm font-semibold text-foreground">
                            {totalProjectHours}h allocated across all phases
                          </span>
                        </div>
                      </>
                    ) : phase ? (
                      <>
                        <div className="flex justify-between items-center min-h-[20px]">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sprints:</span>
                          <span className="text-sm font-semibold text-foreground">
                            {phase.sprints.length} sprint{phase.sprints.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center min-h-[20px]">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours:</span>
                          <span className="text-sm font-semibold text-foreground">
                            {totalAllocatedHours}h allocated
                          </span>
                        </div>
                        {allocations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Team Allocations:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {allocations.map((allocation, index) => (
                                <div key={index} className="flex justify-between items-center text-xs">
                                  <span className="text-card-foreground truncate max-w-[200px]" title={allocation.consultantName}>
                                    {allocation.consultantName}
                                  </span>
                                  <span className="font-medium text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0">
                                    {allocation.hours}h
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {allocations.length === 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-muted-foreground italic">No team allocations assigned yet</div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            }}
          />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-muted-foreground text-lg mb-2">No phases to display</div>
              <div className="text-muted-foreground text-sm">Create phases to see them on the timeline</div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Project Timeline View:</div>
        <div className="text-xs text-blue-700 dark:text-blue-400">
          This view shows your project phases as a timeline. Each row represents a phase with its timeline bar. Hover over any phase bar to see detailed information including dates, duration, team allocations, and progress.
        </div>
      </div>
    </div>
  );
}