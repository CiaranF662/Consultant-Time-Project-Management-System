'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@prisma/client';
import axios from 'axios';
import { FaTimes, FaTrash } from 'react-icons/fa';

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
}

export default function EditProjectModal({ project, onClose }: EditProjectModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.patch(`/api/projects/${project.id}`, { title, description });
      onClose();
      router.refresh();
    } catch (err) {
      setError('Failed to save changes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        if (window.confirm('Second confirmation: Are you absolutely sure? This will delete all associated sprints, tasks, and hour logs.')) {
            setIsLoading(true);
            try {
                await axios.delete(`/api/projects/${project.id}`);
                router.push('/dashboard');
                router.refresh();
            } catch (error) {
                alert('Failed to delete project.');
                setIsLoading(false);
            }
        }
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg z-50 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <FaTimes size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Project</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex items-center gap-2 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
            <FaTrash />
            {isLoading ? 'Deleting...' : 'Delete Project'}
          </button>
          <div className="flex items-center">
            <button onClick={onClose} className="py-2 px-4 text-sm font-medium rounded-md hover:bg-gray-100">
                Cancel
            </button>
            <button
                onClick={handleSave}
                disabled={isLoading}
                className="ml-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
                {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}