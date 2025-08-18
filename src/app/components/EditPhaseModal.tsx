'use client';

import { useState } from 'react';
import type { Phase } from '@prisma/client';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';

interface EditPhaseModalProps {
  phase: Phase;
  onClose: () => void; // This will trigger the page refresh
}

export default function EditPhaseModal({ phase, onClose }: EditPhaseModalProps) {
  const [name, setName] = useState(phase.name);
  const [description, setDescription] = useState(phase.description || '');
  const [startDate, setStartDate] = useState(new Date(phase.startDate).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(phase.endDate).toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.patch(`/api/phases/${phase.id}`, { name, description, startDate, endDate });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg z-50 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><FaTimes size={20} /></button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Phase</h2>
        <div className="space-y-4">
            <div>
              <label htmlFor="edit-phase-name" className="block text-sm font-medium text-gray-700">Phase Name</label>
              <input id="edit-phase-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-phase-startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                <input id="edit-phase-startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required/>
              </div>
              <div>
                <label htmlFor="edit-phase-endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                <input id="edit-phase-endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required/>
              </div>
            </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        <div className="flex justify-end items-center mt-6 pt-4 border-t">
          <button type="button" onClick={onClose} className="py-2 px-4 text-sm font-medium rounded-md hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={isLoading} className="ml-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}