'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Target, User, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import GanttChart from '@/app/(features)/reports/components/GanttChart';

interface WeeklyAllocation {
  id: string;
  plannedHours: number;
  actualHours: number | null;
  weekStartDate: Date;
  weekEndDate: Date;
  weekNumber: number;
  year: number;
  phaseAllocation: {
    id: string;
    totalHours: number;
    phase: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      project: {
        id: string;
        title: string;
        startDate: Date;
        endDate: Date | null;
      };
      sprints: Sprint[];
    };
  };
}

interface PhaseAllocation {
  id: string;
  totalHours: number;
  phase: {
    id: string;
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      title: string;
      description: string | null;
      startDate: Date;
      endDate: Date | null;
    };
    sprints: Sprint[];
  };
  weeklyAllocations: WeeklyAllocation[];
}

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
  goals: string | null;
}

interface Project {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  phases: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    sprints: Sprint[];
  }[];
  consultants: {
    userId: string;
    user: { name: string };
  }[];
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

interface ConsultantGanttClientProps {
  data: {
    weeklyAllocations: WeeklyAllocation[];
    phaseAllocations: PhaseAllocation[];
    projects: Project[];
    currentWeekNumber: number;
    currentYear: number;
  };
  userId: string;
  userName: string;
}

export default function ConsultantGanttClient({ data, userId, userName }: ConsultantGanttClientProps) {
  const [weeklyAllocations] = useState<WeeklyAllocation[]>(
    data.weeklyAllocations.map(wa => ({
      ...wa,
      weekStartDate: new Date(wa.weekStartDate),
      weekEndDate: new Date(wa.weekEndDate),
      phaseAllocation: {
        ...wa.phaseAllocation,
        phase: {
          ...wa.phaseAllocation.phase,
          startDate: new Date(wa.phaseAllocation.phase.startDate),
          endDate: new Date(wa.phaseAllocation.phase.endDate),
          project: {
            ...wa.phaseAllocation.phase.project,
            startDate: new Date(wa.phaseAllocation.phase.project.startDate),
            endDate: wa.phaseAllocation.phase.project.endDate ? new Date(wa.phaseAllocation.phase.project.endDate) : null
          },
          sprints: wa.phaseAllocation.phase.sprints.map(sprint => ({
            ...sprint,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
          }))
        }
      }
    }))
  );

  const [phaseAllocations] = useState<PhaseAllocation[]>(
    data.phaseAllocations.map(pa => ({
      ...pa,
      phase: {
        ...pa.phase,
        startDate: new Date(pa.phase.startDate),
        endDate: new Date(pa.phase.endDate),
        project: {
          ...pa.phase.project,
          startDate: new Date(pa.phase.project.startDate),
          endDate: pa.phase.project.endDate ? new Date(pa.phase.project.endDate) : null
        },
        sprints: pa.phase.sprints.map(sprint => ({
          ...sprint,
          startDate: new Date(sprint.startDate),
          endDate: new Date(sprint.endDate),
        }))
      },
      weeklyAllocations: pa.weeklyAllocations.map(wa => ({
        ...wa,
        weekStartDate: new Date(wa.weekStartDate),
        weekEndDate: new Date(wa.weekEndDate),
      }))
    }))
  );

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
        }))
      }))
    }))
  );

  const [viewMode, setViewMode] = useState<'weeks' | 'phases' | 'sprints'>('weeks');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);

  useEffect(() => {
    generateGanttTasks();
  }, [viewMode, selectedProject, weeklyAllocations, phaseAllocations]);

  const generateGanttTasks = () => {
    const tasks: GanttTask[] = [];

    if (viewMode === 'weeks') {
      // Show weekly allocations
      const filteredAllocations = selectedProject === 'all' 
        ? weeklyAllocations 
        : weeklyAllocations.filter(wa => wa.phaseAllocation.phase.project.id === selectedProject);

      filteredAllocations.forEach(weeklyAlloc => {
        const progress = calculateWeekProgress(weeklyAlloc);
        tasks.push({
          id: weeklyAlloc.id,
          name: `${weeklyAlloc.phaseAllocation.phase.project.title} - ${weeklyAlloc.phaseAllocation.phase.name}`,
          start: weeklyAlloc.weekStartDate,
          end: weeklyAlloc.weekEndDate,
          progress,
          assignee: userName,
          priority: weeklyAlloc.plannedHours > 20 ? 'high' : weeklyAlloc.plannedHours > 10 ? 'medium' : 'low',
          type: 'task'
        });
      });
    } else if (viewMode === 'phases') {
      // Show phase allocations
      const filteredPhases = selectedProject === 'all' 
        ? phaseAllocations 
        : phaseAllocations.filter(pa => pa.phase.project.id === selectedProject);

      filteredPhases.forEach(phaseAlloc => {
        const progress = calculatePhaseProgress(phaseAlloc.phase);
        tasks.push({
          id: phaseAlloc.id,
          name: `${phaseAlloc.phase.project.title} - ${phaseAlloc.phase.name}`,
          start: phaseAlloc.phase.startDate,
          end: phaseAlloc.phase.endDate,
          progress,
          assignee: userName,
          priority: phaseAlloc.totalHours > 40 ? 'high' : phaseAlloc.totalHours > 20 ? 'medium' : 'low',
          type: 'task'
        });
      });
    } else if (viewMode === 'sprints') {
      // Show sprints from assigned projects
      const filteredProjects = selectedProject === 'all' 
        ? projects 
        : projects.filter(p => p.id === selectedProject);

      filteredProjects.forEach(project => {
        project.phases.forEach(phase => {
          phase.sprints.forEach(sprint => {
            const progress = calculateSprintProgress(sprint);
            tasks.push({
              id: sprint.id,
              name: `${project.title} - Sprint ${sprint.sprintNumber}`,
              start: sprint.startDate,
              end: sprint.endDate,
              progress,
              assignee: userName,
              priority: 'medium',
              type: 'task'
            });
          });
        });
      });
    }

    setGanttTasks(tasks);
  };

  const calculateWeekProgress = (weeklyAlloc: WeeklyAllocation): number => {
    const now = new Date();
    const total = weeklyAlloc.weekEndDate.getTime() - weeklyAlloc.weekStartDate.getTime();
    const elapsed = now.getTime() - weeklyAlloc.weekStartDate.getTime();
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const calculatePhaseProgress = (phase: { startDate: Date; endDate: Date }): number => {
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

  // Calculate stats
  const totalPlannedHours = weeklyAllocations.reduce((sum, wa) => sum + wa.plannedHours, 0);
  const totalActualHours = weeklyAllocations.reduce((sum, wa) => sum + (wa.actualHours || 0), 0);
  const activeProjects = [...new Set(phaseAllocations.map(pa => pa.phase.project.id))].length;
  const currentWeekHours = weeklyAllocations
    .filter(wa => wa.weekNumber === data.currentWeekNumber && wa.year === data.currentYear)
    .reduce((sum, wa) => sum + wa.plannedHours, 0);

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
              <h1 className="text-3xl font-bold text-gray-800">My Task Timeline</h1>
              <p className="text-gray-600 mt-2">
                Personal timeline showing your assignments and deadlines
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Target className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Active Projects</div>
                <div className="font-medium text-2xl text-gray-800">{activeProjects}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Clock className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">This Week</div>
                <div className="font-medium text-2xl text-gray-800">{currentWeekHours}h</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Total Planned</div>
                <div className="font-medium text-2xl text-gray-800">{totalPlannedHours}h</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Total Actual</div>
                <div className="font-medium text-2xl text-gray-800">{totalActualHours}h</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* View Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeline View
              </label>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'weeks', label: 'Weekly Tasks', icon: Calendar },
                  { key: 'phases', label: 'Phase Work', icon: Target },
                  { key: 'sprints', label: 'Sprint Schedule', icon: TrendingUp }
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

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Filter
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {ganttTasks.length > 0 ? (
          <GanttChart
            tasks={ganttTasks}
            title={`My ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Timeline`}
            viewMode="week"
            showAssignees={false}
            showProgress={true}
            className="shadow-md"
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Tasks Assigned</h3>
            <p className="text-gray-600 mb-4">
              You don't have any {viewMode} assigned yet. Contact your Project Manager or Growth Team to get assigned to projects.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}