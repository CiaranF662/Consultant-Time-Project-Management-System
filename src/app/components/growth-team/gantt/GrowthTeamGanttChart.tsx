'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { FaCalendarAlt, FaCalendarWeek, FaCalendar, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';

// Use any to avoid type conflicts for now - we'll cast the data as needed
interface GrowthTeamGanttChartProps {
  projects: any[];
}

export default function GrowthTeamGanttChart({ projects }: GrowthTeamGanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5, 0.75, 1, 1.25, 1.5, 2
  const router = useRouter();

  const handleTaskClick = (task: Task) => {
    // Extract project ID from task ID (format: "project-{id}")
    const projectId = task.id.replace('project-', '');
    router.push(`/dashboard/projects/${projectId}`);
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const getColumnWidth = () => {
    const baseWidth = viewMode === ViewMode.Year ? 600 : viewMode === ViewMode.Month ? 300 : viewMode === ViewMode.Week ? 100 : 30;
    return Math.round(baseWidth * zoomLevel);
  };

  // Calculate project progress based on time elapsed
  const calculateProjectProgress = React.useCallback((project: any): number => {
    const projectStart = new Date(project.startDate);
    const projectEnd = project.endDate ? new Date(project.endDate) : new Date(projectStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();

    // If project hasn't started yet
    if (today < projectStart) return 0;

    // If project is completed
    if (today > projectEnd) return 100;

    // Calculate progress based on time elapsed
    const totalDuration = projectEnd.getTime() - projectStart.getTime();
    const elapsedDuration = today.getTime() - projectStart.getTime();

    return Math.round((elapsedDuration / totalDuration) * 100);
  }, []);

  // Transform project data into Gantt chart format - one row per project
  const transformProjectsToTasks = React.useMemo((): Task[] => {
    const tasks: Task[] = [];

    projects.forEach((project: any) => {
      const projectStart = new Date(project.startDate);
      const projectEnd = project.endDate ? new Date(project.endDate) : new Date(projectStart.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Add only the project as a task (phases will be rendered within the project row)
      const projectTask: Task = {
        start: projectStart,
        end: projectEnd,
        name: project.title,
        id: `project-${project.id}`,
        type: 'task',
        progress: calculateProjectProgress(project),
        isDisabled: false,
        styles: {
          progressColor: '#1e40af',
          progressSelectedColor: '#1d4ed8',
          backgroundColor: '#3b82f6', // Blue background for project
          backgroundSelectedColor: '#2563eb',
        },
      };
      tasks.push(projectTask);
    });

    return tasks;
  }, [projects, calculateProjectProgress]);

  // Calculate phase progress based on time elapsed
  const calculatePhaseProgress = (phase: any): number => {
    const phaseStart = new Date(phase.startDate);
    const phaseEnd = new Date(phase.endDate);
    const today = new Date();

    if (today < phaseStart) return 0;
    if (today > phaseEnd) return 100;

    const totalDuration = phaseEnd.getTime() - phaseStart.getTime();
    const elapsedDuration = today.getTime() - phaseStart.getTime();

    return Math.round((elapsedDuration / totalDuration) * 100);
  };

  // Get color scheme for different phase types
  const getPhaseColor = (phaseName: string) => {
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
    // Default color for other phases
    return {
      background: '#a78bfa',
      backgroundSelected: '#8b5cf6',
      progress: '#8b5cf6',
      progressSelected: '#7c3aed',
    };
  };

  // Get project duration in days
  const getProjectDuration = (project: any): number => {
    const startDate = new Date(project.startDate);
    const endDate = project.endDate ? new Date(project.endDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tasks = transformProjectsToTasks;

  return (
    <div className="h-full">
      {/* Custom styles for better year visibility */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .gantt-container .gantt-timeline .gantt-header {
            background-color: #f9fafb !important;
          }
          .gantt-container .gantt-timeline .gantt-header-top {
            background-color: #f3f4f6 !important;
            font-weight: 600 !important;
            border-bottom: 2px solid #d1d5db !important;
            font-size: ${viewMode === ViewMode.Month ? '14px' : '12px'} !important;
          }
          .gantt-container .gantt-timeline .gantt-header-bottom {
            font-size: ${viewMode === ViewMode.Month ? '13px' : '11px'} !important;
            font-weight: 500 !important;
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
            <span className="text-sm font-medium text-gray-700">View Mode:</span>
            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-1">
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
                      : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Zoom:</span>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
              <button
                onClick={zoomOut}
                disabled={zoomLevel <= 0.5}
                className={`p-2 rounded-md transition-all duration-200 ${
                  zoomLevel <= 0.5
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
                title="Zoom Out"
              >
                <FaSearchMinus className="h-3 w-3" />
              </button>
              <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={zoomLevel >= 2}
                className={`p-2 rounded-md transition-all duration-200 ${
                  zoomLevel >= 2
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                }`}
                title="Zoom In"
              >
                <FaSearchPlus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {projects.length} project{projects.length !== 1 ? 's' : ''} • {projects.reduce((total, p) => total + (p.phases?.length || 0), 0)} total phases
        </div>
      </div>

      {/* Gantt Chart */}
      <div
        className="border border-gray-200 rounded-lg overflow-hidden"
        style={{
          height: projects.length <= 12
            ? `${Math.max(projects.length * 50 + 100, 200)}px` // Dynamic height: 50px per project row (35px name + 15px phases) + 100px for header/padding
            : 'calc(100vh - 300px)', // Fixed height with scroll for 12+ projects
          minHeight: '200px',
          maxHeight: 'calc(100vh - 300px)'
        }}
      >
        {tasks.length > 0 ? (
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
            onDoubleClick={handleTaskClick}
            headerHeight={viewMode === ViewMode.Month ? 80 : 50}
            locale="en-US"
            TaskListHeader={() => (
              <div
                className="font-bold text-gray-900 bg-gray-200 border-r-2 border-gray-400 px-3 py-3 text-center"
                style={{
                  height: viewMode === ViewMode.Month ? '80px' : '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Project Name
              </div>
            )}
            TaskListTable={({ tasks }) => (
              <div className="bg-gray-50 border-r-2 border-gray-300">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-4 border-b border-gray-200 text-sm font-semibold text-gray-900 overflow-hidden bg-white hover:bg-gray-50 transition-colors"
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
              const project = projects.find((p: any) => `project-${p.id}` === task.id);
              const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24));
              const consultantCount = project?.consultants?.length || 0;
              const phaseCount = project?.phases?.length || 0;

              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
                  <div className="font-bold text-gray-800 mb-3 text-lg truncate" title={task.name}>
                    {task.name}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600">Start Date:</span>
                      <span className="text-sm font-semibold text-gray-800">{formatDate(task.start)}</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600">End Date:</span>
                      <span className="text-sm font-semibold text-gray-800">{formatDate(task.end)}</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600">Duration:</span>
                      <span className="text-sm font-semibold text-gray-800">{duration} days</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600">Progress:</span>
                      <span className="text-sm font-semibold text-blue-600">{task.progress}%</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600">Phases:</span>
                      <span className="text-sm font-semibold text-gray-800">{phaseCount} phase{phaseCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600">Team Size:</span>
                      <span className="text-sm font-semibold text-gray-800">{consultantCount} consultant{consultantCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between items-center min-h-[20px]">
                      <span className="text-sm font-medium text-gray-600">Budget:</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {project?.budgetedHours ? `${project.budgetedHours} hours` : 'Not set'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 text-lg mb-2">No projects to display</div>
              <div className="text-gray-500 text-sm">Create a project to see it on the Gantt chart</div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm font-medium text-blue-800 mb-1">How to use:</div>
        <div className="text-xs text-blue-700">
          Each row shows a project with its timeline bar. Project phases are listed below each project name. Hover over any project bar to see detailed information including dates, duration, team size, and budget.
        </div>
      </div>
    </div>
  );
}