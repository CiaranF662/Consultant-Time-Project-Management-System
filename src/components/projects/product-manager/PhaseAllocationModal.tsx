'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaSave, FaPlus, FaTrash } from 'react-icons/fa';
import { formatHours } from '@/lib/dates';
import axios from 'axios';

interface PhaseAllocation {
  id: string;
  consultantId: string;
  totalHours: number;
  consultant: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Phase {
  id: string;
  name: string;
  allocations: PhaseAllocation[];
}

interface Project {
  id: string;
  consultants: Array<{
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
}

interface Consultant {
  id: string;
  name: string | null;
  email: string | null;
}

interface AllocationEntry {
  consultantId: string;
  totalHours: number;
  existingId?: string;
}

interface PhaseAllocationModalProps {
  phase: Phase;
  project: Project;
  allConsultants: Consultant[];
  onClose: () => void;
  onAllocationUpdated: () => void;
}

export default function PhaseAllocationModal({ 
  phase, 
  project, 
  allConsultants, 
  onClose, 
  onAllocationUpdated 
}: PhaseAllocationModalProps) {
  const [allocations, setAllocations] = useState<AllocationEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get project consultants only
  const projectConsultants = allConsultants.filter(consultant =>
    project.consultants.some(pc => pc.userId === consultant.id)
  );

  useEffect(() => {
    // Initialize with existing allocations
    const initialAllocations: AllocationEntry[] = phase.allocations.map(alloc => ({
      consultantId: alloc.consultantId,
      totalHours: alloc.totalHours,
      existingId: alloc.id
    }));
    
    setAllocations(initialAllocations);
  }, [phase]);

  const addAllocation = () => {
    // Find available consultants
    const usedConsultantIds = allocations.map(a => a.consultantId);
    const availableConsultants = projectConsultants.filter(c => !usedConsultantIds.includes(c.id));
    
    if (availableConsultants.length > 0) {
      setAllocations(prev => [...prev, {
        consultantId: availableConsultants[0].id,
        totalHours: 0
      }]);
    }
  };

  const removeAllocation = (index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: 'consultantId' | 'totalHours', value: string | number) => {
    setAllocations(prev => prev.map((alloc, i) => 
      i === index ? { ...alloc, [field]: value } : alloc
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    const duplicateConsultants = allocations
      .map(a => a.consultantId)
      .filter((id, index, arr) => arr.indexOf(id) !== index);
    
    if (duplicateConsultants.length > 0) {
      setError('Cannot assign the same consultant multiple times');
      return;
    }
    
    const invalidHours = allocations.some(a => a.totalHours <= 0);
    if (invalidHours) {
      setError('All allocations must have positive hours');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`/api/phases/${phase.id}/allocations`, {
        allocations: allocations.map(alloc => ({
          consultantId: alloc.consultantId,
          totalHours: Number(alloc.totalHours),
          existingId: alloc.existingId
        }))
      });
      
      onAllocationUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update allocations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAllocated = allocations.reduce((sum, alloc) => sum + Number(alloc.totalHours || 0), 0);
  const availableConsultants = projectConsultants.filter(c => 
    !allocations.map(a => a.consultantId).includes(c.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Manage Phase Allocations</h2>
              <p className="text-sm text-gray-600 mt-1">{phase.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-gray-600 rounded"
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

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-foreground">Resource Allocations</h3>
              <div className="text-sm text-gray-600">
                Total Allocated: <span className="font-semibold">{formatHours(totalAllocated)}</span>
              </div>
            </div>

            {allocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No allocations set. Click "Add Allocation" to assign hours to team members.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allocations.map((allocation, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-card-foreground mb-1">
                        Consultant
                      </label>
                      <select
                        value={allocation.consultantId}
                        onChange={(e) => updateAllocation(index, 'consultantId', e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={isSubmitting}
                        required
                      >
                        <option value="">Select consultant</option>
                        {projectConsultants
                          .filter(c => c.id === allocation.consultantId || !allocations.map(a => a.consultantId).includes(c.id))
                          .map((consultant) => (
                            <option key={consultant.id} value={consultant.id}>
                              {consultant.name || consultant.email}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="w-32">
                      <label className="block text-sm font-medium text-card-foreground mb-1">
                        Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={allocation.totalHours}
                        onChange={(e) => updateAllocation(index, 'totalHours', parseFloat(e.target.value) || 0)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div className="w-10">
                      <button
                        type="button"
                        onClick={() => removeAllocation(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        disabled={isSubmitting}
                        title="Remove allocation"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {availableConsultants.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={addAllocation}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  disabled={isSubmitting}
                >
                  <FaPlus />
                  Add Allocation
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h4 className="text-sm font-medium text-foreground mb-2">Allocation Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Team Members Assigned:</span>
                <span className="ml-2 font-medium">{allocations.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Hours:</span>
                <span className="ml-2 font-medium">{formatHours(totalAllocated)}</span>
              </div>
            </div>
            {projectConsultants.length > allocations.length && (
              <p className="text-xs text-muted-foreground mt-2">
                {projectConsultants.length - allocations.length} team member(s) not assigned
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-card-foreground bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              {isSubmitting ? 'Saving...' : 'Save Allocations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}