'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaTimes, FaTrash, FaBriefcase, FaUsers, FaUser, FaPlus, FaCheck, FaCalendar } from 'react-icons/fa';

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface EditProjectModalProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    budgetedHours: number;
    startDate: Date | string;
    endDate: Date | string | null;
    consultants: Array<{
      userId: string;
      role?: string;
      user: {
        id?: string;
        name: string | null;
        email?: string | null;
      };
    }>;
    productManagerId: string | null;
  };
  onClose: () => void;
}

export default function EditProjectModal({ project, onClose }: EditProjectModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [budgetedHours, setBudgetedHours] = useState(project.budgetedHours.toString());
  
  // Consultant management
  const [allConsultants, setAllConsultants] = useState<User[]>([]);
  const [selectedProductManagerId, setSelectedProductManagerId] = useState(project.productManagerId || '');
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>(
    project.consultants.filter(c => c.role !== 'PRODUCT_MANAGER' && c.userId !== project.productManagerId).map(c => c.userId)
  );
  
  // Search and dropdown states
  const [pmSearchQuery, setPmSearchQuery] = useState('');
  const [consultantSearchQuery, setConsultantSearchQuery] = useState('');
  const [showPmDropdown, setShowPmDropdown] = useState(false);
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all consultants when modal opens
  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const { data } = await axios.get('/api/users?role=CONSULTANT');
        setAllConsultants(data);
      } catch (err) {
        setError('Failed to load consultants.');
      }
    };
    fetchConsultants();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowPmDropdown(false);
        setShowConsultantDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter functions
  const getAvailableProductManagers = () => {
    return allConsultants.filter(consultant =>
      (consultant.name || consultant.email || '').toLowerCase().includes(pmSearchQuery.toLowerCase())
    );
  };

  const getAvailableConsultants = () => {
    return allConsultants.filter(consultant =>
      consultant.id !== selectedProductManagerId &&
      !selectedConsultantIds.includes(consultant.id) &&
      (consultant.name || consultant.email || '').toLowerCase().includes(consultantSearchQuery.toLowerCase())
    );
  };

  const getSelectedProductManager = () => {
    return allConsultants.find(c => c.id === selectedProductManagerId);
  };

  const getSelectedConsultants = () => {
    return allConsultants.filter(c => selectedConsultantIds.includes(c.id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form
      if (!title.trim()) {
        throw new Error('Project title is required');
      }
      if (!selectedProductManagerId) {
        throw new Error('Product Manager is required');
      }
      if (!budgetedHours || parseInt(budgetedHours) <= 0) {
        throw new Error('Valid budget hours required');
      }

      // Update basic project info
      await axios.patch(`/api/projects/${project.id}`, {
        title: title.trim(),
        description: description.trim() || null,
        budgetedHours: parseInt(budgetedHours)
      });

      // Update consultants (this might need a separate API endpoint)
      const allProjectConsultantIds = [...new Set([selectedProductManagerId, ...selectedConsultantIds])];
      const consultantsData = allProjectConsultantIds.map(id => ({
        userId: id,
        role: id === selectedProductManagerId ? 'PRODUCT_MANAGER' : 'TEAM_MEMBER'
      }));

      await axios.patch(`/api/projects/${project.id}/consultants`, {
        consultants: consultantsData
      });

      onClose();
      router.refresh();
    } catch (err: any) {
      console.error('Error updating project consultants:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to update project consultants. Only Growth Team members can manage project team assignments.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to update project');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    if (!window.confirm('Second confirmation: Are you absolutely sure? This will delete all associated phases, sprints, and allocations.')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(`/api/projects/${project.id}`);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      setError('Failed to delete project.');
      setIsLoading(false);
    }
  };

  const removeConsultant = (consultantId: string) => {
    setSelectedConsultantIds(prev => prev.filter(id => id !== consultantId));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h1 className="text-xl font-bold">Edit Project</h1>
            <p className="text-blue-100">Update project details and team assignments</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-6 p-6">
            
            {/* Basic Project Information */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <FaBriefcase className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Project Details</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaBriefcase className="w-3 h-3 text-blue-600" />
                      Project Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                      placeholder="Enter project name..."
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                      placeholder="Describe the project goals and scope..."
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="budgetedHours" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaCalendar className="w-3 h-3 text-blue-600" />
                      Budget Hours *
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        id="budgetedHours"
                        value={budgetedHours}
                        onChange={(e) => setBudgetedHours(e.target.value)}
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                        min="1"
                        required
                        placeholder="480"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-lg border-2 border-l-0 border-gray-200 bg-gray-50 text-gray-700 font-medium text-sm">
                        hours
                      </span>
                    </div>
                  </div>

                  {/* Project dates info (read-only) */}
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Start Date:</span> {new Date(project.startDate).toLocaleDateString()}
                    </div>
                    {project.endDate && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">End Date:</span> {new Date(project.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Team Assignment */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                  <FaUsers className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Team Assignment</h2>
              </div>
              
              <div className="space-y-6">
                {/* Product Manager Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaUser className="w-3 h-3 text-purple-600" />
                    Product Manager *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pmSearchQuery}
                      onChange={(e) => {
                        setPmSearchQuery(e.target.value);
                        setShowPmDropdown(true);
                      }}
                      onFocus={() => setShowPmDropdown(true)}
                      placeholder="Search for Product Manager..."
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200"
                    />
                    
                    {/* Selected PM Display */}
                    {selectedProductManagerId && !showPmDropdown && (
                      <div className="mt-2 p-2 bg-purple-100 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-800">
                            {getSelectedProductManager()?.name || getSelectedProductManager()?.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductManagerId('');
                              setPmSearchQuery('');
                            }}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* PM Dropdown */}
                    {showPmDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getAvailableProductManagers().map((consultant) => (
                          <button
                            key={consultant.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductManagerId(consultant.id);
                              setPmSearchQuery('');
                              setShowPmDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span>{consultant.name || consultant.email}</span>
                            {selectedProductManagerId === consultant.id && (
                              <FaCheck className="w-3 h-3 text-green-600" />
                            )}
                          </button>
                        ))}
                        {getAvailableProductManagers().length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">No consultants found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Members Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaUsers className="w-3 h-3 text-purple-600" />
                    Team Members
                  </label>
                  
                  {/* Selected Consultants */}
                  {selectedConsultantIds.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {getSelectedConsultants().map((consultant) => (
                        <div
                          key={consultant.id}
                          className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          <span>{consultant.name || consultant.email}</span>
                          <button
                            type="button"
                            onClick={() => removeConsultant(consultant.id)}
                            className="hover:text-purple-600"
                          >
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Consultant Search */}
                  <div className="relative">
                    <div className="flex">
                      <input
                        type="text"
                        value={consultantSearchQuery}
                        onChange={(e) => {
                          setConsultantSearchQuery(e.target.value);
                          setShowConsultantDropdown(true);
                        }}
                        onFocus={() => setShowConsultantDropdown(true)}
                        placeholder="Search to add team members..."
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-l-lg focus:border-purple-500 focus:ring-purple-500 focus:ring-opacity-50 transition-all duration-200"
                      />
                      <button
                        type="button"
                        className="px-4 py-2 bg-purple-600 text-white rounded-r-lg hover:bg-purple-700 transition-colors duration-200"
                        onClick={() => setShowConsultantDropdown(!showConsultantDropdown)}
                      >
                        <FaPlus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Consultant Dropdown */}
                    {showConsultantDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getAvailableConsultants().map((consultant) => (
                          <button
                            key={consultant.id}
                            type="button"
                            onClick={() => {
                              setSelectedConsultantIds(prev => [...prev, consultant.id]);
                              setConsultantSearchQuery('');
                              setShowConsultantDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50"
                          >
                            {consultant.name || consultant.email}
                          </button>
                        ))}
                        {getAvailableConsultants().length === 0 && (
                          <div className="px-3 py-2 text-gray-500 text-sm">No available consultants</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors duration-200"
          >
            <FaTrash className="w-4 h-4" />
            {isLoading ? 'Deleting...' : 'Delete Project'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors duration-200"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}