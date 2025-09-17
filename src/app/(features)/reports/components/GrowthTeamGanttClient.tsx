'use client';

import { useState, useEffect } from 'react';
import { Calendar, BarChart3, Users, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import GanttChart from './GanttChart';

interface Project {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  budgetedHours: number;
  phases: Phase[];
  consultants: { user: { name: string } }[];
}

interface Phase {
  id: string;
  name: string;
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
}

interface Allocation {
  id: string;
  totalHours: number;
  consultant: { name: string };
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

export default function GrowthTeamGanttClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'projects' | 'phases' | 'sprints'>('projects');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      generateGanttTasks();
    }
  }, [projects, viewMode, selectedProjects]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get('/api/projects');
      const projectsWithDates = data.map((project: any) => ({
        ...project,
        startDate: new Date(project.startDate),
        endDate: project.endDate ? new Date(project.endDate) : null,
        phases: project.phases?.map((phase: any) => ({
          ...phase,
          startDate: new Date(phase.startDate),
          endDate: new Date(phase.endDate),
          sprints: phase.sprints?.map((sprint: any) => ({
            ...sprint,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
          })) || []
        })) || []
      }));
      setProjects(projectsWithDates);
      setSelectedProjects(projectsWithDates.map((p: Project) => p.id));
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateGanttTasks = () => {
    const tasks: GanttTask[] = [];
    const filteredProjects = projects.filter(p => selectedProjects.includes(p.id));

    if (viewMode === 'projects') {
      // Show projects as tasks
      filteredProjects.forEach(project => {
        const endDate = project.endDate || new Date(project.startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default
        const progress = calculateProjectProgress(project);
        
        tasks.push({
          id: project.id,
          name: project.title,
          start: project.startDate,
          end: endDate,
          progress,
          assignee: `${project.consultants.length} consultants`,
          priority: progress < 30 ? 'high' : progress < 70 ? 'medium' : 'low',
          type: 'project'
        });
      });
    } else if (viewMode === 'phases') {
      // Show phases across all selected projects
      filteredProjects.forEach(project => {
        project.phases.forEach(phase => {
          const progress = calculatePhaseProgress(phase);
          tasks.push({
            id: phase.id,
            name: `${project.title} - ${phase.name}`,
            start: phase.startDate,
            end: phase.endDate,
            progress,
            assignee: `${phase.allocations.length} allocated`,
            priority: progress < 30 ? 'high' : progress < 70 ? 'medium' : 'low',
            type: 'task'
          });
        });
      });
    } else if (viewMode === 'sprints') {
      // Show sprints across all selected projects
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
              assignee: phase.allocations.map(a => a.consultant.name).join(', ') || 'Unassigned',
              priority: 'medium',
              type: 'task'
            });
          });
        });
      });
    }

    setGanttTasks(tasks);
  };

  const calculateProjectProgress = (project: Project): number => {
    if (!project.phases.length) return 0;
    const phaseProgresses = project.phases.map(calculatePhaseProgress);
    return phaseProgresses.reduce((sum, progress) => sum + progress, 0) / phaseProgresses.length;
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

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading portfolio timeline...</p>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-800">Portfolio Timeline</h1>
              <p className="text-gray-600 mt-2">
                Comprehensive timeline view of all projects, phases, and sprint schedules
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Total Projects</div>
                <div className="font-medium text-2xl text-gray-800">{projects.length}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Calendar className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Active Phases</div>
                <div className="font-medium text-2xl text-gray-800">
                  {projects.reduce((sum, p) => sum + p.phases.length, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Clock className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Total Sprints</div>
                <div className="font-medium text-2xl text-gray-800">
                  {projects.reduce((sum, p) => 
                    sum + p.phases.reduce((phaseSum, phase) => phaseSum + phase.sprints.length, 0), 0
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Users className="text-gray-400" />
              <div>
                <div className="text-sm text-gray-600">Team Members</div>
                <div className="font-medium text-2xl text-gray-800">
                  {[...new Set(projects.flatMap(p => p.consultants.map(c => c.user.name)))].length}
                </div>
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
                  { key: 'projects', label: 'Projects', icon: BarChart3 },
                  { key: 'phases', label: 'Phases', icon: TrendingUp },
                  { key: 'sprints', label: 'Sprints', icon: Calendar }
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key as any)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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
              <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                {projects.map((project) => (
                  <label key={project.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded text-sm">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProjectSelection(project.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{project.title}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {ganttTasks.length > 0 ? (
          <GanttChart
            tasks={ganttTasks}
            title={`${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Timeline`}
            viewMode="week"
            showAssignees={true}
            showProgress={true}
            className="shadow-md"
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Timeline Data</h3>
            <p className="text-gray-600 mb-4">
              No {viewMode} found for the selected projects. Try selecting different projects or changing the view mode.
            </p>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Manage Projects
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}