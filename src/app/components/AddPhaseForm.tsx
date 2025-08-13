'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface AddPhaseFormProps {
  projectId: string;
}

export default function AddPhaseForm({ projectId }: AddPhaseFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await axios.post(`/api/projects/${projectId}/phases`, {
        name,
        description,
        startDate,
        endDate,
      });
      // Clear the form and refresh the page to show the new phase
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add phase.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Phase</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="phase-name" className="block text-sm font-medium text-gray-700">Phase Name</label>
          <input
            id="phase-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
            placeholder="e.g., Phase 1: Discovery"
          />
        </div>
        <div>
          <label htmlFor="phase-description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="phase-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="What is the goal of this phase?"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phase-startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              id="phase-startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="phase-endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              id="phase-endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Adding...' : 'Add Phase'}
          </button>
        </div>
      </form>
    </div>
  );
}