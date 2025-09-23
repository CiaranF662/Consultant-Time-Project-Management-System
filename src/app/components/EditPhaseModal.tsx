'use client';

import { useState } from 'react';
import type { Phase, Sprint } from '@prisma/client';
import axios from 'axios';
import { FaTimes, FaTrash, FaSave } from 'react-icons/fa';

interface PhaseWithSprints extends Phase {
  sprints: Sprint[];
}

interface EditPhaseModalProps {
  phase: PhaseWithSprints;
  projectSprints: Sprint[];
  existingPhases?: Array<{
    id: string;
    name: string;
    sprints: Sprint[];
  }>;
  onClose: () => void;
  onDelete: () => void;
}

export default function EditPhaseModal({ phase, projectSprints, onClose, onDelete }: EditPhaseModalProps) {
  const [name, setName] = useState(phase.name);
  const [description, setDescription] = useState(phase.description || '');
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>(phase.sprints?.map(s => s.id) || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Sprint 0 is available for selection (only for Project Kickoff phase)
  const isSprintAvailableForSelection = (sprint: Sprint): boolean => {
    const today = new Date();
    const sprintEndDate = new Date(sprint.endDate);

    // Sprint 0 can only be selected if this IS the "Project Kickoff" phase
    if (sprint.sprintNumber === 0) {
      return phase.name === 'Project Kickoff';
    }

    // Past sprints (end date has passed) cannot be selected
    if (sprintEndDate < today) {
      return false;
    }

    return true;
  };

  // Validate that selected sprints are consecutive
  const validateConsecutiveSprints = (sprintIds: string[]): boolean => {
    if (sprintIds.length <= 1) return true;

    const selectedSprints = projectSprints
      .filter(s => sprintIds.includes(s.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    for (let i = 1; i < selectedSprints.length; i++) {
      if (selectedSprints[i].sprintNumber !== selectedSprints[i-1].sprintNumber + 1) {
        return false;
      }
    }
    return true;
  };

  const handleSprintToggle = (sprintId: string) => {
    if (!projectSprints) return;
    
    setSelectedSprintIds(prev => {
      let newSelection;
      
      if (prev.includes(sprintId)) {
        // Removing a sprint
        newSelection = prev.filter(id => id !== sprintId);
      } else {
        // Adding a sprint
        newSelection = [...prev, sprintId].sort((a, b) => {
          const sprintA = projectSprints.find(s => s.id === a);
          const sprintB = projectSprints.find(s => s.id === b);
          return (sprintA?.sprintNumber || 0) - (sprintB?.sprintNumber || 0);
        });
      }
      
      // Check if the new selection is consecutive
      if (!validateConsecutiveSprints(newSelection)) {
        // If not consecutive, don't update selection and show error
        setError('Selected sprints must be consecutive within a phase');
        return prev;
      } else {
        // Clear any previous error
        setError(null);
        return newSelection;
      }
    });
  };

  // Calculate phase dates based on selected sprints
  const getPhasePreview = () => {
    if (selectedSprintIds.length === 0 || !projectSprints) return null;
    
    const selectedSprints = projectSprints
      .filter(s => selectedSprintIds.includes(s.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);
    
    if (selectedSprints.length === 0) return null;
    
    const startDate = new Date(selectedSprints[0].startDate);
    const endDate = new Date(selectedSprints[selectedSprints.length - 1].endDate);
    
    return {
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      sprintRange: `Sprint ${selectedSprints[0].sprintNumber} - Sprint ${selectedSprints[selectedSprints.length - 1].sprintNumber}`
    };
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Phase name is required');
      return;
    }
    
    if (selectedSprintIds.length === 0) {
      setError('At least one sprint must be selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate dates from selected sprints
      if (!projectSprints) {
        setError('Project sprints data is not available');
        setIsLoading(false);
        return;
      }
      
      const selectedSprints = projectSprints
        .filter(s => selectedSprintIds.includes(s.id))
        .sort((a, b) => a.sprintNumber - b.sprintNumber);
      
      const startDate = new Date(selectedSprints[0].startDate);
      const endDate = new Date(selectedSprints[selectedSprints.length - 1].endDate);
      
      // Update phase details
      await axios.patch(`/api/phases/${phase.id}/sprints`, { 
        name: name.trim(), 
        description: description.trim() || null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      // Update sprint assignments
      await axios.patch(`/api/phases/${phase.id}/sprints`, {
        sprintIds: selectedSprintIds
      });
      
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes.');
    } finally {
      setIsLoading(false);
    }
  };

  const phasePreview = getPhasePreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Edit Phase</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
              disabled={isLoading}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Phase Name */}
          <div className="mb-4">
            <label htmlFor="phaseName" className="block text-sm font-medium text-gray-700 mb-2">
              Phase Name *
            </label>
            <input
              type="text"
              id="phaseName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Planning Phase, Development Phase"
              disabled={isLoading}
              required
            />
          </div>

          {/* Phase Description */}
          <div className="mb-6">
            <label htmlFor="phaseDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="phaseDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description of what this phase includes"
              disabled={isLoading}
            />
          </div>

          {/* Sprint Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Sprints *
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Select consecutive sprints for this phase. Phases can overlap and share sprints.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
              {projectSprints && projectSprints.length > 0 ? projectSprints.map((sprint) => {
                const isAvailable = isSprintAvailableForSelection(sprint);
                const isCurrentlySelected = selectedSprintIds.includes(sprint.id);
                const isPastSprint = new Date(sprint.endDate) < new Date();

                return (
                  <label
                    key={sprint.id}
                    className={`flex items-center p-2 rounded transition-all duration-200 ${
                      !isAvailable
                        ? 'cursor-not-allowed bg-gray-100 border border-gray-200 opacity-60'
                        : 'cursor-pointer hover:bg-gray-50'
                    } ${
                      isCurrentlySelected ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isCurrentlySelected}
                      onChange={() => isAvailable && handleSprintToggle(sprint.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={isLoading || !isAvailable}
                    />
                    <div className="ml-3 flex-1">
                      <div className={`text-sm font-medium ${!isAvailable ? 'text-gray-500' : 'text-gray-700'}`}>
                        Sprint {sprint.sprintNumber}
                        {sprint.sprintNumber === 0 && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                            Project Kickoff
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${!isAvailable ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                      </div>
                      {!isAvailable && (
                        <div className="text-xs text-red-500 mt-1">
                          {isPastSprint && 'Phase has ended'}
                          {sprint.sprintNumber === 0 && phase.name !== 'Project Kickoff' && 'Sprint 0 reserved for Project Kickoff only'}
                        </div>
                      )}
                    </div>
                  </label>
                );
              }) : (
                <div className="text-center text-gray-500 py-4">
                  No sprints available for this project
                </div>
              )}
            </div>
          </div>

          {/* Phase Preview */}
          {phasePreview && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Updated Phase Preview</h4>
              <div className="text-sm text-blue-700">
                <p><strong>Duration:</strong> {phasePreview.startDate} - {phasePreview.endDate}</p>
                <p><strong>Sprints:</strong> {phasePreview.sprintRange}</p>
                <p><strong>Selected Sprints:</strong> {selectedSprintIds.length}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              onClick={onDelete}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              <FaTrash />
              {isLoading ? 'Deleting...' : 'Delete Phase'}
            </button>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isLoading}
              >
                <FaSave />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}