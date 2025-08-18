'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';

interface AddPhaseFormProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPhaseForm({ projectId, isOpen, onClose }: AddPhaseFormProps) {
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
      onClose(); // Close the modal on success
      router.refresh(); // THIS IS THE FIX: Refresh the page data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add phase.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg z-50 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <FaTimes size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Phase</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phase-name" className="block text-sm font-medium text-gray-700">Phase Name</label>
              <input id="phase-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required placeholder="e.g., Phase 1: Discovery"/>
            </div>
            <div>
              <label htmlFor="phase-description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea id="phase-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="What is the goal of this phase?"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phase-startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                <input id="phase-startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required/>
              </div>
              <div>
                <label htmlFor="phase-endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                <input id="phase-endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required/>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end pt-4 mt-4 border-t">
              <button type="button" onClick={onClose} className="py-2 px-4 text-sm font-medium rounded-md hover:bg-gray-100">Cancel</button>
              <button type="submit" disabled={isLoading} className="ml-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                {isLoading ? 'Adding...' : 'Add Phase'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
}