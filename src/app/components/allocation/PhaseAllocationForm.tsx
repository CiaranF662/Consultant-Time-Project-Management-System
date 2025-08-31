// src/app/components/PhaseAllocationForm.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
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
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [allocations, setAllocations] = useState<PhaseAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProjectConsultants();
      initializeAllocations();
    }
  }, [isOpen, existingAllocations]);

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
    // Check for empty consultant selections
    const hasEmptyConsultant = allocations.some(a => !a.consultantId);
    if (hasEmptyConsultant) {
      alert('Please select a consultant for all allocations.');
      return false;
    }

    // Check for zero hours
    const hasZeroHours = allocations.some(a => !a.hours || a.hours <= 0);
    if (hasZeroHours) {
      alert('Please enter hours greater than 0 for all allocations.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateAllocations()) return;

    setIsSaving(true);
    try {
      await axios.post(`/api/phases/${phaseId}/allocations`, {
        allocations: allocations.filter(a => a.consultantId && a.hours > 0)
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save phase allocations:', error);
      alert('Failed to save allocations. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl z-50 relative max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Phase Hour Allocation</h2>
              <p className="text-gray-600 mt-1">Assign consultants and hours to: <strong>{phaseName}</strong></p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {allocations.map((allocation, index) => {
              const availableConsultants = getAvailableConsultants(index);
              const selectedConsultant = consultants.find(c => c.id === allocation.consultantId);
              
              return (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consultant
                    </label>
                    <select
                      value={allocation.consultantId}
                      onChange={(e) => updateAllocation(index, 'consultantId', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={allocation.hours || ''}
                      onChange={(e) => updateAllocation(index, 'hours', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  {selectedConsultant && (
                    <div className={`px-3 py-1 rounded text-sm ${generateColorFromString(selectedConsultant.id)}`}>
                      {selectedConsultant.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}

                  {allocations.length > 1 && (
                    <button
                      onClick={() => removeAllocation(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Allocation Button */}
          <button
            onClick={addAllocation}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            disabled={allocations.some(a => !a.consultantId)}
          >
            <FaPlus className="w-4 h-4" />
            Add Another Consultant
          </button>

          {/* Summary */}
          {allocations.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Total Hours Allocated:</span>
                <span className="text-2xl font-bold text-blue-600">{getTotalHours()}h</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Across {allocations.filter(a => a.consultantId).length} consultant(s)
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || allocations.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSaving ? 'Saving...' : 'Save Allocations'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}