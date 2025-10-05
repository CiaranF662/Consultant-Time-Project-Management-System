'use client';

import { useState, useEffect } from 'react';
import GrowthTeamGanttChart from '@/components/growth-team/gantt/GrowthTeamGanttChart';
import PageLoader from '@/components/ui/PageLoader';
import axios from 'axios';

export default function GanttPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await axios.get('/api/projects');
        setProjects(data || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
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
          <p className="text-lg text-gray-600 dark:text-gray-400">Visual timeline of all projects</p>
        </div>
        <GrowthTeamGanttChart projects={projects} />
      </div>

  );
}