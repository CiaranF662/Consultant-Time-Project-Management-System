'use client';

import type { Sprint } from '@prisma/client';
import { FaTimes } from 'react-icons/fa';

interface LogHoursModalProps {
  // TODO: Update to use new WeeklyAllocation model
  sprint: Sprint;
  projectId: string;
  onClose: () => void;
}

export default function LogHoursModal({ onClose }: LogHoursModalProps) {
  // TODO: This component needs to be updated to work with the new WeeklyAllocation model
  // Temporarily disabled to prevent build errors
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Hours Logging</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            This feature is temporarily unavailable while we update to the new allocation system.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}