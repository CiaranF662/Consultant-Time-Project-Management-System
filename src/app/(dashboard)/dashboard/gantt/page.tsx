'use client';

import { useState, useEffect } from 'react';
import GrowthTeamGanttChart from '@/components/growth-team/gantt/GrowthTeamGanttChart';
import PageLoader from '@/components/ui/PageLoader';
import axios from 'axios';

export default function GanttPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'GROWTH_TEAM' | 'CONSULTANT' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user is a Product Manager
        const pmStatusResponse = await axios.get('/api/current-user/pm-status');
        const { isProductManager } = pmStatusResponse.data;

        // Try to fetch from /api/projects first to check role
        const projectsResponse = await axios.get('/api/projects');
        const allProjects = projectsResponse.data || [];

        // If user is a PM but not Growth Team, show only managed projects
        if (isProductManager && allProjects.length > 0) {
          // Fetch only managed projects for PMs
          const managedResponse = await axios.get('/api/projects/managed');
          const managedProjects = managedResponse.data || [];

          console.log('PM Status - Fetching managed projects:', managedProjects.length, 'projects');
          setProjects(managedProjects);
          setUserRole('CONSULTANT'); // PM is still a CONSULTANT role, just with PM assignments
        } else {
          // Growth Team or regular consultant - show all projects
          console.log('Fetching all projects:', allProjects.length, 'projects');
          setProjects(allProjects);
          setUserRole('GROWTH_TEAM');
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      
        <PageLoader message="Loading project timeline..." />
      
    );
  }

  return (

      <div className="px-4 py-6 md:px-8 md:py-8 min-h-screen bg-background">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Portfolio Timeline View</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {userRole === 'GROWTH_TEAM'
              ? 'Visual timeline of all projects'
              : 'Visual timeline of your managed projects'
            }
          </p>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Projects to Display</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {userRole === 'GROWTH_TEAM'
                ? 'No projects have been created yet.'
                : 'You are not managing any projects yet.'
              }
            </p>
          </div>
        ) : (
          <GrowthTeamGanttChart projects={projects} />
        )}
      </div>

  );
}