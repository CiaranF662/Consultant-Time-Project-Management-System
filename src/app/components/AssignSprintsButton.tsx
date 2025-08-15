'use client';

import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import type { Sprint } from '@prisma/client';
import AssignSprintsModal from './AssignSprintsModal'; // Import the new modal

interface AssignSprintsButtonProps {
  phaseId: string;
  unassignedSprints: Sprint[];
}

export default function AssignSprintsButton({ phaseId, unassignedSprints }: AssignSprintsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        <FaPlus />
        Assign Sprints
      </button>

      {isModalOpen && (
        <AssignSprintsModal
          phaseId={phaseId}
          unassignedSprints={unassignedSprints}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}