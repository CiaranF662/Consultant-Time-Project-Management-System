'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Sprint } from '@prisma/client';
import { FaTimes } from 'react-icons/fa';
import axios from 'axios';

interface AssignSprintsModalProps {
  phaseId: string;
  unassignedSprints: Sprint[];
  onClose: () => void;
}

export default function AssignSprintsModal({
  phaseId,
  unassignedSprints,
  onClose,
}: AssignSprintsModalProps) {
  const router = useRouter();
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckboxChange = (sprintId: string) => {
    setSelectedSprintIds((prev) =>
      prev.includes(sprintId)
        ? prev.filter((id) => id !== sprintId)
        : [...prev, sprintId]
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await axios.patch(`/api/phases/${phaseId}/sprints`, {
        sprintIds: selectedSprintIds,
      });
      onClose();
      router.refresh();
    } catch (err: any) {
      // --- THIS IS THE UPDATED ERROR HANDLING LOGIC ---
      // It now checks if a specific error message was sent from the API
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to save assignments. Please try again.');
      }
      // --- END OF UPDATE ---
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg z-50 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <FaTimes size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">Assign Sprints</h2>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {unassignedSprints.length > 0 ? (
            unassignedSprints.map((sprint) => (
              <label
                key={sprint.id}
                className="flex items-center space-x-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSprintIds.includes(sprint.id)}
                  onChange={() => handleCheckboxChange(sprint.id)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700">Sprint {sprint.sprintNumber}</span>
              </label>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No unassigned sprints available.</p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

        <div className="flex justify-end items-center mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="py-2 px-4 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || selectedSprintIds.length === 0}
            className="ml-4 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}