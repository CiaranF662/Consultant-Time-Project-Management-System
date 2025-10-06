'use client';

import { useState, useEffect, useRef } from 'react';
import type { Phase, Sprint } from '@prisma/client';
import axios from 'axios';
import { FaTimes, FaTrash, FaSave, FaProjectDiagram, FaCalendarAlt, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaEdit } from 'react-icons/fa';
import { formatDate } from '@/lib/dates';

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
  const modalRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(phase.name);
  const [description, setDescription] = useState(phase.description || '');
  const [selectedSprintIds, setSelectedSprintIds] = useState<string[]>(phase.sprints?.map(s => s.id) || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current === event.target) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Check if Sprint is available for selection
  const isSprintAvailableForSelection = (sprint: Sprint): boolean => {
    const today = new Date();
    const sprintEndDate = new Date(sprint.endDate);

    // Sprint 0 can only be selected if this IS the "Project Kickoff" phase
    if (sprint.sprintNumber === 0) {
      return phase.name === 'Project Kickoff';
    }

    // Past sprints (end date has passed) cannot be selected unless already selected
    if (sprintEndDate < today) {
      return selectedSprintIds.includes(sprint.id);
    }

    return true;
  };

  // Validate that selected sprints are consecutive
  const validateConsecutiveSprints = (sprintIds: string[]): boolean => {
    if (sprintIds.length <= 1) return true;

    const selectedSprints = projectSprints
      .filter(sprint => sprintIds.includes(sprint.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    for (let i = 1; i < selectedSprints.length; i++) {
      if (selectedSprints[i].sprintNumber !== selectedSprints[i - 1].sprintNumber + 1) {
        return false;
      }
    }

    return true;
  };

  const handleSprintSelection = (sprintId: string, checked: boolean) => {
    let newSelection: string[];
    if (checked) {
      newSelection = [...selectedSprintIds, sprintId];
    } else {
      newSelection = selectedSprintIds.filter(id => id !== sprintId);
    }

    setSelectedSprintIds(newSelection);
    setError(null);
  };

  const getSelectedSprintsSummary = () => {
    if (selectedSprintIds.length === 0) return null;

    const selectedSprints = projectSprints
      .filter(sprint => selectedSprintIds.includes(sprint.id))
      .sort((a, b) => a.sprintNumber - b.sprintNumber);

    const startDate = new Date(selectedSprints[0].startDate);
    const endDate = new Date(selectedSprints[selectedSprints.length - 1].endDate);

    const sprintNumbers = selectedSprints.map(s => s.sprintNumber);
    const isConsecutive = validateConsecutiveSprints(selectedSprintIds);

    return {
      count: selectedSprints.length,
      startDate,
      endDate,
      sprintNumbers,
      isConsecutive
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Phase name is required');
      return;
    }

    if (selectedSprintIds.length === 0) {
      setError('Please select at least one sprint');
      return;
    }

    if (!validateConsecutiveSprints(selectedSprintIds)) {
      setError('Selected sprints must be consecutive');
      return;
    }

    setIsLoading(true);

    try {
      await axios.put(`/api/phases/${phase.id}`, {
        name: name.trim(),
        description: description.trim(),
        sprintIds: selectedSprintIds
      });

      onClose();
    } catch (error: any) {
      console.error('Error updating phase:', error);
      setError(error.response?.data?.error || 'Failed to update phase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    // Prevent double submission
    if (isLoading) return;

    if (!confirm('Are you sure you want to delete this phase? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(`/api/phases/${phase.id}`);
      onDelete();
    } catch (error: any) {
      console.error('Error deleting phase:', error);
      setError(error.response?.data?.error || 'Failed to delete phase');
      setIsLoading(false);
    }
  };

  const summary = getSelectedSprintsSummary();
  const availableSprints = projectSprints.sort((a, b) => a.sprintNumber - b.sprintNumber);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaEdit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit Phase</h1>
              <p className="text-indigo-100">Modify phase: <strong>{phase.name}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
            disabled={isLoading}
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <FaExclamationTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Phase Details Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-800/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <FaProjectDiagram className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Phase Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="phaseName" className="block text-sm font-medium text-card-foreground mb-2">
                    Phase Name *
                  </label>
                  <input
                    type="text"
                    id="phaseName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                    placeholder="Enter a descriptive phase name..."
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="phaseDescription" className="block text-sm font-medium text-card-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    id="phaseDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                    placeholder="Describe the objectives and scope of this phase..."
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Sprint Selection Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/20 p-6 rounded-lg border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <FaCalendarAlt className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Sprint Assignment</h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select the sprints that will be part of this phase. Sprints must be consecutive.
              </p>

              <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                {availableSprints.map((sprint) => {
                  const isAvailable = isSprintAvailableForSelection(sprint);
                  const isSelected = selectedSprintIds.includes(sprint.id);
                  const isPastSprint = new Date(sprint.endDate) < new Date();

                  return (
                    <div
                      key={sprint.id}
                      className={`p-3 rounded-lg border transition-all duration-200 ${
                        isSelected
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30'
                          : isAvailable
                          ? 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/30'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`sprint-${sprint.id}`}
                          checked={isSelected}
                          onChange={(e) => handleSprintSelection(sprint.id, e.target.checked)}
                          disabled={!isAvailable || isLoading}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <label
                          htmlFor={`sprint-${sprint.id}`}
                          className={`ml-3 flex-1 cursor-pointer ${isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">Sprint {sprint.sprintNumber}</span>
                              {sprint.sprintNumber === 0 && (
                                <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                  Project Kickoff
                                </span>
                              )}
                              {isPastSprint && !isSelected && (
                                <span className="text-red-500 dark:text-red-400 text-sm ml-2">(Past sprint)</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                  <FaInfoCircle className="w-4 h-4 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Sprint Selection Rules:</p>
                    <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                      <li>• Selected sprints must be consecutive (no gaps)</li>
                      <li>• Sprint 0 is reserved for the Project Kickoff phase only</li>
                      <li>• Past sprints can be kept if already assigned</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase Summary */}
            {summary && (
              <div className={`p-6 rounded-lg border ${
                summary.isConsecutive
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/20 border-green-200 dark:border-green-700'
                  : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-800/20 border-red-200 dark:border-red-700'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  {summary.isConsecutive ? (
                    <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <FaExclamationTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <h3 className={`font-semibold ${summary.isConsecutive ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    Updated Phase Summary
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-card-foreground">{summary.count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sprints Selected</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-card-foreground">{formatDate(summary.startDate)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Start Date</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-card-foreground">{formatDate(summary.endDate)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">End Date</div>
                  </div>
                </div>

                {!summary.isConsecutive && (
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ⚠️ Selected sprints are not consecutive. Please ensure there are no gaps between selected sprints.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 border border-transparent rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <FaTrash className="mr-2" />
                Delete Phase
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-medium text-card-foreground bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !summary?.isConsecutive || selectedSprintIds.length === 0}
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 border border-transparent rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  <FaSave className="mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}