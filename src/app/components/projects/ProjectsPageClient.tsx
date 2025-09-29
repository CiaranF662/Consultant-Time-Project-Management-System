'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import ProjectCard from '@/app/components/projects/ProjectCard';
import CreateProjectModal from '@/app/components/projects/CreateProjectModal';
import { useTheme } from '@/app/contexts/ThemeContext';

interface ProjectsPageClientProps {
  projects: any[];
  isGrowthTeam: boolean;
}

export default function ProjectsPageClient({ projects, isGrowthTeam }: ProjectsPageClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { theme } = useTheme();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {isGrowthTeam ? 'All Projects' : 'Your Projects'}
        </h1>
        {isGrowthTeam && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <FaPlus />
            Create New Project
          </button>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project as any} />
          ))}
        </div>
      ) : (
        <div className={`text-center py-12 px-6 rounded-lg shadow-md border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No Projects Yet</h3>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {isGrowthTeam 
              ? 'Click "Create New Project" to get started.' 
              : 'You have not been assigned to any projects yet.'}
          </p>
        </div>
      )}

      {/* Create Project Modal */}
      {isGrowthTeam && (
        <CreateProjectModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            // Modal handles navigation to project page automatically
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}