'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaPlus } from 'react-icons/fa';

interface AddTaskFormProps {
  sprintId: string;
  projectId: string;
}

export default function AddTaskForm({ sprintId, projectId }: AddTaskFormProps) {
  const router = useRouter();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // Add state for description
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      await axios.post(`/api/tasks`, {
        title,
        description, // Send description to the API
        sprintId,
        projectId,
      });
      setTitle('');
      setDescription(''); // Reset description field
      setIsFormVisible(false);
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create task.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFormVisible) {
    return (
      <button
        onClick={() => setIsFormVisible(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 py-2 px-4 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50"
      >
        <FaPlus />
        Add Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border border-gray-300 bg-white p-4">
      <div>
        <label htmlFor={`title-${sprintId}`} className="block text-sm font-medium text-gray-700">Task Title</label>
        <input
          id={`title-${sprintId}`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for this task..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
          autoFocus
        />
      </div>
      {/* --- NEW DESCRIPTION FIELD --- */}
      <div>
        <label htmlFor={`description-${sprintId}`} className="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea
          id={`description-${sprintId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add more details..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsFormVisible(false)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Adding...' : 'Add Task'}
        </button>
      </div>
    </form>
  );
}