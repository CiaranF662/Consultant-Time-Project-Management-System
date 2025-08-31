'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import axios from 'axios';

interface Sprint {
  id: string;
  sprintNumber: number;
  startDate: Date | string;
  endDate: Date | string;
}

interface Project {
  id: string;
  title: string;
  sprints: Sprint[];
}

interface PhaseCreationModalProps {
  project: Project;
  onClose: () => void;
  onPhaseCreated: () => void;
}

export default function PhaseCreationModal({ project, onClose, onPhaseCreated }: PhaseCreationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSprintToggle = (sprintId: string) => {
    setSelectedSprintIds(prev => {
      if (prev.includes(sprintId)) {
        return prev.filter(id => id !== sprintId);
      } else {
        return [...prev, sprintId].sort((a, b) => {
          const sprintA = project.sprints.find(s => s.id === a);
          const sprintB = project.sprints.find(s => s.id === b);
          return (sprintA?.sprintNumber || 0) - (sprintB?.sprintNumber || 0);
        });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('Phase name is required');
      return;
    }
    
    if (selectedSprintIds.length === 0) {
      setError('At least one sprint must be selected');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`/api/projects/${project.id}/phases`, {
        name: name.trim(),
        description: description.trim() || null,
        sprintIds: selectedSprintIds
      });
      
      onPhaseCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create phase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate phase dates based on selected sprints
  const getPhasePreview = () => {
    if (selectedSprintIds.length === 0) return null;
    
    const selectedSprints = project.sprints
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

  const phasePreview = getPhasePreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Create New Phase</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded"
              disabled={isSubmitting}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Sprint Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Sprints *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
              {project.sprints.map((sprint) => (
                <label
                  key={sprint.id}
                  className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                    selectedSprintIds.includes(sprint.id) ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSprintIds.includes(sprint.id)}
                    onChange={() => handleSprintToggle(sprint.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSubmitting}
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-700">
                      Sprint {sprint.sprintNumber}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Phase Preview */}
          {phasePreview && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Phase Preview</h4>
              <div className="text-sm text-blue-700">
                <p><strong>Duration:</strong> {phasePreview.startDate} - {phasePreview.endDate}</p>
                <p><strong>Sprints:</strong> {phasePreview.sprintRange}</p>
                <p><strong>Selected Sprints:</strong> {selectedSprintIds.length}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              <FaSave />
              {isSubmitting ? 'Creating...' : 'Create Phase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}