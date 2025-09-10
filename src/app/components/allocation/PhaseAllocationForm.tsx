// src/app/components/PhaseAllocationForm.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTimes, FaPlus, FaTrash, FaSave, FaUsers, FaClock, FaInfoCircle, FaUser } from 'react-icons/fa';
import { generateColorFromString } from '@/lib/colors';

interface Consultant {
  id: string;
  name: string;
  email: string;
}

interface PhaseAllocation {
  consultantId: string;
  hours: number;
}

interface PhaseAllocationFormProps {
  projectId: string;
  phaseId: string;
  phaseName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  existingAllocations?: {
    consultantId: string;
    consultantName: string;
    hours: number;
  }[];
}

export default function PhaseAllocationForm({
  projectId,
  phaseId,
  phaseName,
  isOpen,
  onClose,
  onSaved,
  existingAllocations = []
}: PhaseAllocationFormProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [allocations, setAllocations] = useState<PhaseAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjectConsultants();
      initializeAllocations();
      setError(null);
    }
  }, [isOpen, existingAllocations]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current === event.target) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const fetchProjectConsultants = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/consultants`);
      setConsultants(response.data);
    } catch (error) {
      console.error('Failed to fetch project consultants:', error);
    }
  };

  const initializeAllocations = () => {
    if (existingAllocations.length > 0) {
      // Load existing allocations
      setAllocations(
        existingAllocations.map(ea => ({
          consultantId: ea.consultantId,
          hours: ea.hours
        }))
      );
    } else {
      // Start with empty allocation
      setAllocations([{ consultantId: '', hours: 0 }]);
    }
  };

  const addAllocation = () => {
    setAllocations(prev => [...prev, { consultantId: '', hours: 0 }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: keyof PhaseAllocation, value: string | number) => {
    setAllocations(prev => prev.map((allocation, i) => {
      if (i === index) {
        return { ...allocation, [field]: value };
      }
      return allocation;
    }));
  };

  const getAvailableConsultants = (currentIndex: number) => {
    const selectedIds = allocations
      .filter((_, index) => index !== currentIndex)
      .map(a => a.consultantId)
      .filter(Boolean);
    
    return consultants.filter(c => !selectedIds.includes(c.id));
  };

  const getTotalHours = () => {
    return allocations.reduce((total, allocation) => total + (allocation.hours || 0), 0);
  };

  const validateAllocations = () => {
    setError(null);

    // Check for empty consultant selections
    const hasEmptyConsultant = allocations.some(a => !a.consultantId);
    if (hasEmptyConsultant) {
      setError('Please select a consultant for all allocations.');
      return false;
    }

    // Check for zero hours (allow 0 hours for allocations that might be placeholders)
    const hasNegativeHours = allocations.some(a => a.hours < 0);
    if (hasNegativeHours) {
      setError('Hours cannot be negative.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateAllocations()) return;

    setIsSaving(true);
    try {
      await axios.post(`/api/phases/${phaseId}/allocations`, {
        allocations: allocations.filter(a => a.consultantId)
      });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Failed to save phase allocations:', error);
      setError(error.response?.data?.error || 'Failed to save allocations. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Phase Hour Allocation</h1>
              <p className="text-indigo-100">Manage consultant hours for: <strong>{phaseName}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
            disabled={isSaving}
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            
            {/* Hour Allocation Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <FaUsers className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Consultant Hour Allocations</h2>
              </div>
              
              <p className="text-xs text-gray-600 mb-4">
                Assign specific hour allocations to consultants for this phase.
              </p>

              <div className="space-y-4">
                {allocations.map((allocation, index) => {
                  const availableConsultants = getAvailableConsultants(index);
                  const selectedConsultant = consultants.find(c => c.id === allocation.consultantId);
                  
                  return (
                    <div key={index} className="bg-white rounded-lg border-2 border-blue-200 p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FaUser className="w-3 h-3 text-blue-600" />
                            Consultant
                          </label>
                          <select
                            value={allocation.consultantId}
                            onChange={(e) => updateAllocation(index, 'consultantId', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                            disabled={isSaving}
                          >
                            <option value="">Select Consultant</option>
                            {availableConsultants.map(consultant => (
                              <option key={consultant.id} value={consultant.id}>
                                {consultant.name}
                              </option>
                            ))}
                            {selectedConsultant && !availableConsultants.find(c => c.id === selectedConsultant.id) && (
                              <option key={selectedConsultant.id} value={selectedConsultant.id}>
                                {selectedConsultant.name}
                              </option>
                            )}
                          </select>
                        </div>

                        <div className="w-32">
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FaClock className="w-3 h-3 text-blue-600" />
                            Hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={allocation.hours || ''}
                            onChange={(e) => updateAllocation(index, 'hours', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                            placeholder="0"
                            disabled={isSaving}
                          />
                        </div>

                        {selectedConsultant && (
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${generateColorFromString(selectedConsultant.id)}`}>
                              {selectedConsultant.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          </div>
                        )}

                        {allocations.length > 1 && (
                          <button
                            onClick={() => removeAllocation(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            disabled={isSaving}
                            title="Remove allocation"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Allocation Button */}
              <button
                onClick={addAllocation}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200 border-2 border-dashed border-blue-300"
                disabled={allocations.some(a => !a.consultantId) || isSaving}
              >
                <FaPlus className="w-4 h-4" />
                Add Another Consultant
              </button>
            </div>

            {/* Summary Section */}
            {allocations.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 text-sm text-green-800 font-semibold mb-4">
                  <FaInfoCircle className="w-4 h-4" />
                  Allocation Summary
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{getTotalHours()}</div>
                    <div className="text-sm text-green-700">Total Hours</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{allocations.filter(a => a.consultantId).length}</div>
                    <div className="text-sm text-green-700">Consultants</div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || allocations.length === 0 || allocations.some(a => !a.consultantId)}
            className="py-2 px-6 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            <FaSave className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      </div>
    </div>
  );
}