'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import GanttChart from './GanttChart';

interface Project {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  budgetedHours: number;
  phases: Phase[];
  sprints: Sprint[];
  consultants: Consultant[];
}

interface Phase {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  sprints: Sprint[];
  allocations: Allocation[];
}

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
  goals: string | null;
}

interface Allocation {
  id: string;
  totalHours: number;
  consultant: { id: string; name: string; email: string };
  weeklyAllocations: WeeklyAllocation[];
}

interface WeeklyAllocation {
  id: string;
  plannedHours: number;
  weekStartDate: Date;
  weekEndDate: Date;
  weekNumber: number;
  year: number;
}

interface Consultant {
  userId: string;
  user: { id: string; name: string; email: string };
}

interface GanttTask {
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

interface ProductManagerGanttClientProps {
  data: { projects: Project[] };
  userId: string;
}

export default function ProductManagerGanttClient({ data, userId }: ProductManagerGanttClientProps) {
  const [projects] = useState<Project[]>(
    data.projects.map(project => ({
      ...project,
      startDate: new Date(project.startDate),
      endDate: project.endDate ? new Date(project.endDate) : null,
      phases: project.phases.map(phase => ({
        ...phase,
        startDate: new Date(phase.startDate),
        endDate: new Date(phase.endDate),
        sprints: phase.sprints.map(sprint => ({
          ...sprint,
          startDate: new Date(sprint.startDate),
          endDate: new Date(sprint.endDate),
        })),
        allocations: phase.allocations.map(allocation => ({
          ...allocation,
          weeklyAllocations: allocation.weeklyAllocations.map(wa => ({
            ...wa,
            weekStartDate: new Date(wa.weekStartDate),
            weekEndDate: new Date(wa.weekEndDate),
          }))
        }))
      })),
      sprints: project.sprints.map(sprint => ({
        ...sprint,
        startDate: new Date(sprint.startDate),
        endDate: new Date(sprint.endDate),
      }))
    }))
  );

  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || '');
  const [viewMode, setViewMode] = useState<'phases' | 'sprints' | 'tasks'>('phases');
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);

  useEffect(() => {
    generateGanttTasks();
  }, [selectedProject, viewMode, projects]);

  const generateGanttTasks = () => {
    const tasks: GanttTask[] = [];
    const project = projects.find(p => p.id === selectedProject);
    
    if (!project) {
      setGanttTasks([]);
      return;
    }

    if (viewMode === 'phases') {
      // Show phases for selected project
      project.phases.forEach((phase, index) => {
        const progress = calculatePhaseProgress(phase);
        const assignees = phase.allocations.map(a => a.consultant.name).join(', ') || 'Unassigned';
        
        tasks.push({
          id: phase.id,
          name: phase.name,
          start: phase.startDate,
          end: phase.endDate,
          progress,
          assignee: assignees,
          priority: progress < 30 ? 'high' : progress < 70 ? 'medium' : 'low',
          type: 'task',
          dependencies: index > 0 ? [project.phases[index - 1].id] : undefined
        });
      });
    } else if (viewMode === 'sprints') {
      // Show sprints for selected project
      project.sprints.forEach((sprint, index) => {
        const progress = calculateSprintProgress(sprint);
        const phase = project.phases.find(p => p.sprints.some(s => s.id === sprint.id));
        const assignees = phase?.allocations.map(a => a.consultant.name).join(', ') || 'Unassigned';
        
        tasks.push({
          id: sprint.id,
          name: `Sprint ${sprint.sprintNumber}`,
          start: sprint.startDate,
          end: sprint.endDate,
          progress,
          assignee: assignees,
          priority: 'medium',
          type: 'task',
          dependencies: index > 0 ? [project.sprints[index - 1].id] : undefined
        });
      });
    } else if (viewMode === 'tasks') {
      // Show weekly allocations as tasks
      project.phases.forEach(phase => {
        phase.allocations.forEach(allocation => {
          allocation.weeklyAllocations.forEach(weeklyAlloc => {
            tasks.push({
              id: weeklyAlloc.id,
              name: `${phase.name} - ${allocation.consultant.name}`,
              start: weeklyAlloc.weekStartDate,
              end: weeklyAlloc.weekEndDate,
              progress: calculateWeekProgress(weeklyAlloc),
              assignee: allocation.consultant.name,
              priority: 'low',
              type: 'task'
            });
          });
        });
      });
    }

    setGanttTasks(tasks);
  };

  const calculatePhaseProgress = (phase: Phase): number => {
    const now = new Date();
    const total = phase.endDate.getTime() - phase.startDate.getTime();
    const elapsed = now.getTime() - phase.startDate.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const calculateSprintProgress = (sprint: Sprint): number => {
    const now = new Date();
    const total = sprint.endDate.getTime() - sprint.startDate.getTime();
    const elapsed = now.getTime() - sprint.startDate.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const calculateWeekProgress = (weeklyAlloc: WeeklyAllocation): number => {
    const now = new Date();
    const total = weeklyAlloc.weekEndDate.getTime() - weeklyAlloc.weekStartDate.getTime();
    const elapsed = now.getTime() - weeklyAlloc.weekStartDate.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="bg-gray-50 min-h-screen w-full">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600">
            <FaArrowLeft /> Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800">Project Timeline</h1>
              <p className="text-gray-600 mt-2">
                Sprint and phase timeline management for your projects
              </p>
            </div>
          </div>
        </div>

        {/* Project Stats */}
        {selectedProjectData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-2">
                <Target className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Active Phases</div>
                  <div className="font-medium text-2xl text-gray-800">{selectedProjectData.phases.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Total Sprints</div>
                  <div className="font-medium text-2xl text-gray-800">{selectedProjectData.sprints.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-2">
                <Users className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Team Size</div>
                  <div className="font-medium text-2xl text-gray-800">{selectedProjectData.consultants.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-2">
                <Clock className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600">Budget</div>
                  <div className="font-medium text-2xl text-gray-800">{selectedProjectData.budgetedHours}h</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeline View
              </label>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'phases', label: 'Phases', icon: Target },
                  { key: 'sprints', label: 'Sprints', icon: Calendar },
                  { key: 'tasks', label: 'Tasks', icon: TrendingUp }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key as any)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === mode.key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <mode.icon className="w-4 h-4" />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeline View
              </label>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'phases', label: 'Phases', icon: Target },
                  { key: 'sprints', label: 'Sprints', icon: Calendar },
                  { key: 'tasks', label: 'Tasks', icon: TrendingUp }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key as any)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === mode.key
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <mode.icon className="w-4 h-4" />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Project Description */}
        {selectedProjectData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedProjectData.title}</h3>
            {selectedProjectData.description && (
              <p className="text-gray-600">{selectedProjectData.description}</p>
            )}
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span>
                Start: {selectedProjectData.startDate.toLocaleDateString()}
              </span>
              {selectedProjectData.endDate && (
                <span>
                  End: {selectedProjectData.endDate.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Gantt Chart */}
        {ganttTasks.length > 0 ? (
          <GanttChart
            tasks={ganttTasks}
            title={`${selectedProjectData?.title} - ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Timeline`}
            viewMode="week"
            showAssignees={true}
            showProgress={true}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
            <p className="text-gray-600 mb-4">
              No {viewMode} found for the selected project. Try creating phases or sprints first.
            </p>
            <Link
              href="/dashboard/phase-planning"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Manage Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}