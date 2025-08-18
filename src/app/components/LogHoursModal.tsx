'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ConsultantSprintHours, Sprint } from '@prisma/client';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';

interface LogHoursModalProps {
  // CORRECTED: This now uses 'sprintHours' to match the page component
  sprint: Sprint & { sprintHours: ConsultantSprintHours[] };
  projectId: string;
  onClose: () => void;
}

export default function LogHoursModal({ sprint, projectId, onClose }: LogHoursModalProps) {
  const router = useRouter();
  const [week1Hours, setWeek1Hours] = useState('');
  const [week2Hours, setWeek2Hours] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CORRECTED: Check for hours on the correct property name
  const hasExistingHours = sprint.sprintHours.length > 0;
  const originalWeek1 = sprint.sprintHours.find(h => h.weekNumber === 1)?.hours || 0;
  const originalWeek2 = sprint.sprintHours.find(h => h.weekNumber === 2)?.hours || 0;

  useEffect(() => {
    if (hasExistingHours) {
      setWeek1Hours(originalWeek1.toString());
      setWeek2Hours(originalWeek2.toString());
    }
  }, [hasExistingHours, originalWeek1, originalWeek2]);
  
  const totalHours = (parseFloat(week1Hours) || 0) + (parseFloat(week2Hours) || 0);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (hasExistingHours) {
        if (!reason.trim()) {
          setError('A reason is required to request a change.');
          setIsLoading(false);
          return;
        }
        await axios.post(`/api/requests/hours`, {
          sprintId: sprint.id,
          projectId,
          week1Hours: parseFloat(week1Hours) || 0,
          week2Hours: parseFloat(week2Hours) || 0,
          originalWeek1,
          originalWeek2,
          reason,
        });
      } else {
        await axios.post(`/api/sprints/${sprint.id}/hours`, {
          week1Hours: parseFloat(week1Hours) || 0,
          week2Hours: parseFloat(week2Hours) || 0,
          projectId,
        });
      }
      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg z-50 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <FaTimes size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {hasExistingHours ? 'Request Hour Change for' : 'Log Planned Hours for'} Sprint {sprint.sprintNumber}
        </h2>
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label htmlFor="week1" className="block text-sm font-medium text-gray-700">Week 1 Hours</label>
              <input type="number" id="week1" value={week1Hours} onChange={e => setWeek1Hours(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div className="flex-1">
              <label htmlFor="week2" className="block text-sm font-medium text-gray-700">Week 2 Hours</label>
              <input type="number" id="week2" value={week2Hours} onChange={e => setWeek2Hours(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
            </div>
            <div className="flex-1">
                <label htmlFor="total" className="block text-sm font-medium text-gray-700">Total</label>
                <input type="text" id="total" value={`${totalHours} hours`} readOnly className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 text-gray-500 shadow-sm" />
            </div>
          </div>
          {hasExistingHours && (
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason for Change</label>
              <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="e.g., Additional client feedback requires more design revisions." required />
            </div>
          )}
        </div>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        <div className="flex justify-end items-center mt-6 pt-4 border-t">
          <button onClick={onClose} className="py-2 px-4 text-sm font-medium rounded-md hover:bg-gray-100">Cancel</button>
          <button onClick={handleSubmit} disabled={isLoading} className="ml-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">
            {isLoading ? 'Submitting...' : (hasExistingHours ? 'Submit Request' : 'Save Hours')}
          </button>
        </div>
      </div>
    </div>
  );
}