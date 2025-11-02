'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaTimes, FaTrash, FaBriefcase, FaUsers, FaUser, FaPlus, FaCheck, FaCalendar, FaClock, FaCheckCircle, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
import ConsultantScheduleView from '@/components/projects/allocations/ConsultantScheduleView';

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
      allocatedHours?: number;
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
  const pmDropdownRef = useRef<HTMLDivElement>(null);
  const consultantDropdownRef = useRef<HTMLDivElement>(null);
  
  // Form states
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [budgetedHours, setBudgetedHours] = useState(project.budgetedHours.toString());

  // Start date is fixed (read-only)
  const startDate = new Date(project.startDate).toISOString().split('T')[0];

  // Calculate initial duration in weeks
  const initialDuration = project.endDate
    ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24 * 7))
    : 12; // Default to 12 weeks if no end date

  const [durationWeeks, setDurationWeeks] = useState(initialDuration);

  // Calculate end date based on duration
  const calculateEndDate = (weeks: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (weeks * 7) - 1); // -1 to make it inclusive
    return end.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(durationWeeks);

  // Consultant management
  const [allConsultants, setAllConsultants] = useState<User[]>([]);
  const [selectedProductManagerId, setSelectedProductManagerId] = useState(project.productManagerId || '');
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>(
    project.consultants.filter(c => c.role !== 'PRODUCT_MANAGER' && c.userId !== project.productManagerId).map(c => c.userId)
  );

  // Hour allocation management
  const [consultantAllocations, setConsultantAllocations] = useState<Record<string, number>>(() => {
    const allocations: Record<string, number> = {};
    project.consultants.forEach(c => {
      if (c.allocatedHours) {
        allocations[c.userId] = c.allocatedHours;
      }
    });
    return allocations;
  });
  
  // Search and dropdown states
  const [pmSearchQuery, setPmSearchQuery] = useState('');
  const [consultantSearchQuery, setConsultantSearchQuery] = useState('');
  const [showPmDropdown, setShowPmDropdown] = useState(false);
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Consultant availability state
  const [consultantAvailability, setConsultantAvailability] = useState<Record<string, any>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Consultant commitments state
  const [consultantCommitments, setConsultantCommitments] = useState<Record<string, {
    totalCommittedHours: number;
    canRemove: boolean;
    phases: Record<string, { plannedHours: number; approvedHours: number; }>;
  }>>({});
  const [loadingCommitments, setLoadingCommitments] = useState(false);

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

  // Fetch consultant commitments when modal opens
  useEffect(() => {
    const fetchCommitments = async () => {
      setLoadingCommitments(true);
      try {
        const response = await axios.get(`/api/projects/${project.id}`);
        const commitmentsMap: Record<string, any> = {};
        
        // Process phases and their allocations to calculate commitments
        if (response.data.phases) {
          response.data.phases.forEach((phase: any) => {
            if (phase.phaseAllocations) {
              phase.phaseAllocations.forEach((allocation: any) => {
                const consultantId = allocation.consultantId;
                const plannedHours = allocation.plannedHours || 0;
                const approvedHours = allocation.approvalStatus === 'APPROVED' ? allocation.hours : 0;
                const committedHours = Math.max(plannedHours, approvedHours);
                
                if (!commitmentsMap[consultantId]) {
                  commitmentsMap[consultantId] = {
                    totalCommittedHours: 0,
                    canRemove: true,
                    phases: {}
                  };
                }
                
                commitmentsMap[consultantId].totalCommittedHours += committedHours;
                commitmentsMap[consultantId].phases[phase.id] = {
                  plannedHours,
                  approvedHours
                };
              });
            }
          });
        }
        
        // Update canRemove based on total committed hours
        Object.keys(commitmentsMap).forEach(consultantId => {
          commitmentsMap[consultantId].canRemove = commitmentsMap[consultantId].totalCommittedHours === 0;
        });
        
        setConsultantCommitments(commitmentsMap);
      } catch (err) {
        setConsultantCommitments({});
      } finally {
        setLoadingCommitments(false);
      }
    };
    
    fetchCommitments();
  }, [project.id]);

  // Fetch consultant availability when duration changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!durationWeeks || durationWeeks <= 0) {
        setConsultantAvailability({});
        return;
      }

      setLoadingAvailability(true);
      try {
        const start = new Date(startDate);
        const end = new Date(calculateEndDate(durationWeeks));

        const response = await axios.get('/api/consultants/availability', {
          params: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            excludeProjectId: project.id // Exclude current project from availability calculation
          }
        });

        // Convert array to object keyed by consultant ID with calculated status
        const availabilityMap = response.data.consultants.reduce((acc: any, item: any) => {
          // Calculate status and color based on averageHoursPerWeek
          let availabilityStatus = 'available';
          let availabilityColor = 'bg-green-100 text-green-800';

          if (item.averageHoursPerWeek > 40) {
            availabilityStatus = 'overloaded';
            availabilityColor = 'bg-red-100 text-red-800';
          } else if (item.averageHoursPerWeek > 30) {
            availabilityStatus = 'busy';
            availabilityColor = 'bg-orange-100 text-orange-800';
          } else if (item.averageHoursPerWeek > 15) {
            availabilityStatus = 'partially-busy';
            availabilityColor = 'bg-yellow-100 text-yellow-800';
          }

          // Add project allocations for detailed view
          const projectAllocations: Record<string, number> = {};
          if (item.weeklyBreakdown && item.weeklyBreakdown.length > 0) {
            item.weeklyBreakdown.forEach((week: any) => {
              if (week.projects) {
                week.projects.forEach((project: any) => {
                  if (!projectAllocations[project.projectTitle]) {
                    projectAllocations[project.projectTitle] = 0;
                  }
                  projectAllocations[project.projectTitle] += project.hours;
                });
              }
            });
          }

          // Calculate total available hours over the project period
          // Total capacity = 40h/week * number of weeks
          // Total available = Total capacity - totalAllocatedHours
          const numberOfWeeks = item.weeklyBreakdown?.length || 0;
          const totalCapacity = numberOfWeeks * 40;
          const totalAllocated = parseFloat(item.totalAllocatedHours) || 0;
          const totalAvailable = numberOfWeeks > 0 ? Math.max(0, totalCapacity - totalAllocated) : 0;

          acc[item.consultant.id] = {
            ...item,
            availabilityStatus,
            availabilityColor,
            projectAllocations,
            totalAvailable
          };
          return acc;
        }, {});

        setConsultantAvailability(availabilityMap);
      } catch (err) {
        setConsultantAvailability({});
      } finally {
        setLoadingAvailability(false);
      }
    };

    const timeoutId = setTimeout(fetchAvailability, 300); // Debounce API calls
    return () => clearTimeout(timeoutId);
  }, [durationWeeks, startDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle modal backdrop click
      if (modalRef.current === event.target) {
        onClose();
        return;
      }

      // Handle dropdown clicks
      if (pmDropdownRef.current && !pmDropdownRef.current.contains(event.target as Node)) {
        setShowPmDropdown(false);
      }
      if (consultantDropdownRef.current && !consultantDropdownRef.current.contains(event.target as Node)) {
        setShowConsultantDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

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

  // Duration calculation helpers
  const calculateProjectDays = () => {
    return durationWeeks * 7;
  };

  // Duration validation
  const validateDuration = () => {
    if (durationWeeks < 1) {
      return { isValid: false, error: 'Project must be at least 1 week long' };
    }

    if (durationWeeks > 104) { // 2 years
      return { isValid: false, error: 'Project duration cannot exceed 2 years (104 weeks)' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const calculatedEndDate = new Date(endDate);

    // Warning for projects ending in the past
    if (calculatedEndDate < today) {
      return { isValid: true, error: 'Warning: Project will end in the past' };
    }

    return { isValid: true, error: null };
  };

  // Check if duration has changed from original
  const hasDurationChanged = () => {
    const originalDuration = project.endDate
      ? Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24 * 7))
      : 12;
    return durationWeeks !== originalDuration;
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

      // Validate duration
      const durationValidation = validateDuration();
      if (!durationValidation.isValid) {
        throw new Error(durationValidation.error || 'Invalid duration');
      }

      // Validation for consultant allocations
      if (consultantAllocations) {
        const allTeamMemberIds = [selectedProductManagerId, ...selectedConsultantIds].filter(Boolean);

        // Check for missing allocations
        const consultantsWithoutAllocations = allTeamMemberIds.filter((id: string) => !consultantAllocations[id] || consultantAllocations[id] <= 0);
        if (consultantsWithoutAllocations.length > 0) {
          throw new Error('All selected team members must have allocated hours greater than 0');
        }

        // Check for allocations below minimum (phase commitments)
        for (const id of allTeamMemberIds) {
          const constraints = getConsultantConstraints(id);
          const currentHours = consultantAllocations[id] || 0;
          if (currentHours < constraints.minimumHours) {
            const consultant = allConsultants.find(c => c.id === id);
            const name = consultant?.name || consultant?.email || 'Consultant';
            throw new Error(`${name}: Cannot set project hours below ${constraints.minimumHours}h (already allocated in phases)`);
          }
        }
      }

      // Update basic project info
      await axios.patch(`/api/projects/${project.id}`, {
        title: title.trim(),
        description: description.trim() || null,
        budgetedHours: parseInt(budgetedHours),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });

      // Update consultants with their allocated hours
      const allProjectConsultantIds = [...new Set([selectedProductManagerId, ...selectedConsultantIds])];
      const consultantsData = allProjectConsultantIds.map(id => ({
        userId: id,
        role: id === selectedProductManagerId ? 'PRODUCT_MANAGER' : 'TEAM_MEMBER',
        allocatedHours: consultantAllocations[id] || 0
      }));

      await axios.patch(`/api/projects/${project.id}/consultants`, {
        consultants: consultantsData
      });

      onClose();
      router.refresh();
    } catch (err: any) {
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

  // Validation functions
  const getConsultantConstraints = (consultantId: string) => {
    const commitment = consultantCommitments[consultantId];
    return {
      canRemove: !commitment || commitment.totalCommittedHours === 0,
      minimumHours: commitment?.totalCommittedHours || 0
    };
  };

  const validateHourReduction = (consultantId: string, newHours: number) => {
    const constraints = getConsultantConstraints(consultantId);
    if (newHours < constraints.minimumHours) {
      return {
        valid: false,
        message: `Cannot reduce below ${constraints.minimumHours}h (committed across all phases)`
      };
    }
    return { valid: true, message: '' };
  };

  const removeConsultant = (consultantId: string) => {
    const constraints = getConsultantConstraints(consultantId);
    if (!constraints.canRemove) {
      setError(`Cannot remove consultant: ${constraints.minimumHours}h committed across project phases`);
      return;
    }
    
    setSelectedConsultantIds(prev => prev.filter(id => id !== consultantId));
    // Remove their allocation when removing consultant
    setConsultantAllocations(prev => {
      const newAllocations = { ...prev };
      delete newAllocations[consultantId];
      return newAllocations;
    });
  };

  // Calculate total allocated hours
  const getTotalAllocatedHours = () => {
    const allTeamMemberIds = [selectedProductManagerId, ...selectedConsultantIds].filter(Boolean);
    return allTeamMemberIds.reduce((sum, id) => {
      return sum + (consultantAllocations[id] || 0);
    }, 0);
  };


  const updateConsultantAllocation = (consultantId: string, hours: number) => {
    // Always allow the update, but validate and show error if needed
    const validation = validateHourReduction(consultantId, hours);

    // Set error state for display, but don't block the update
    if (!validation.valid) {
      setError(validation.message);
    } else {
      setError(null);
    }

    // Always update the allocation - user can type any value
    setConsultantAllocations(prev => ({
      ...prev,
      [consultantId]: hours
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaBriefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit Project</h1>
              <p className="text-blue-100">Update project details with professional resource allocation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Budget Progress Indicator - Fixed at top */}
        {budgetedHours && parseInt(budgetedHours) > 0 && Object.keys(consultantAllocations).length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-800/20 border-b border-blue-200 dark:border-blue-700 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-blue-800 dark:text-blue-300">Budget Allocation Progress</span>
                <span className="font-bold text-blue-900 dark:text-blue-200">
                  {getTotalAllocatedHours()} / {budgetedHours} hours
                  <span className="ml-2 text-xs">
                    ({Math.round((getTotalAllocatedHours() / parseInt(budgetedHours)) * 100)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    (getTotalAllocatedHours() / parseInt(budgetedHours)) > 1
                      ? 'bg-gradient-to-r from-red-500 to-red-600' // Over budget
                      : (getTotalAllocatedHours() / parseInt(budgetedHours)) >= 0.8
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500' // Almost full
                      : 'bg-gradient-to-r from-green-500 to-blue-500' // Good
                  }`}
                  style={{
                    width: `${Math.min((getTotalAllocatedHours() / parseInt(budgetedHours)) * 100, 100)}%`
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={`font-medium ${
                  parseInt(budgetedHours) >= getTotalAllocatedHours()
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  Remaining: {parseInt(budgetedHours) - getTotalAllocatedHours()} hours
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Team Members: {[selectedProductManagerId, ...selectedConsultantIds].filter(id => id).length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-6 p-6">
            
            {/* Important Notice */}
            {hasDurationChanged() && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 dark:border-amber-600 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm">
                    <h3 className="font-medium text-amber-800 dark:text-amber-300 mb-1">Duration Change Impact</h3>
                    <p className="text-amber-700 dark:text-amber-400">
                      Changing project duration will adjust the end date and may require updating existing sprints, phases, and resource allocations.
                      Please review all project components after saving these changes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Project Information */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-800/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <FaBriefcase className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Project Details</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                      <FaBriefcase className="w-3 h-3 text-blue-600" />
                      Project Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                      placeholder="Enter project name..."
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-card-foreground mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                      placeholder="Describe the project goals and scope..."
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="budgetedHours" className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
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
                      <span className="inline-flex items-center px-3 rounded-r-lg border-2 border-l-0 border-gray-200 bg-gray-50 text-card-foreground font-medium text-sm">
                        hours
                      </span>
                    </div>
                  </div>

                  {/* Project Timeline Controls */}
                  <div className="space-y-4">
                    {/* Start Date (Read-only) */}
                    <div>
                      <label className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                        <FaCalendar className="w-3 h-3 text-muted-foreground" />
                        Start Date
                      </label>
                      <div className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-card-foreground">
                        {new Date(startDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Start date cannot be changed once project is created</p>
                    </div>

                    {/* Duration Control */}
                    <div>
                      <label htmlFor="duration" className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                        <FaClock className="w-3 h-3 text-blue-600" />
                        Project Duration *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          id="duration"
                          value={durationWeeks}
                          onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 1)}
                          className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 text-center"
                          min="1"
                          max="104"
                          required
                        />
                        <span className="text-sm text-card-foreground font-medium">weeks</span>
                        <div className="flex-1 ml-4">
                          <div className="text-xs text-gray-600">
                            = {calculateProjectDays()} days
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculated End Date */}
                    <div>
                      <label className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                        <FaCalendar className="w-3 h-3 text-green-600" />
                        End Date (Calculated)
                      </label>
                      <div className="w-full px-3 py-2 border-2 border-green-200 rounded-lg bg-green-50 text-green-800 font-medium">
                        {new Date(endDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>

                    {/* Duration Validation */}
                    {(() => {
                      const validation = validateDuration();
                      if (validation.error) {
                        const isWarning = validation.isValid && validation.error.startsWith('Warning:');
                        return (
                          <div className={`p-3 rounded-lg border ${
                            isWarning ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                          }`}>
                            <div className={`text-sm font-medium ${
                              isWarning ? 'text-yellow-800' : 'text-red-800'
                            }`}>
                              {isWarning ? '⚠️' : '❌'} {validation.error}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
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
                <h2 className="text-lg font-bold text-foreground">Team Assignment</h2>
              </div>
              
              <div className="space-y-6">
                {/* Product Manager Selection */}
                <div>
                  <label className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                    <FaUser className="w-3 h-3 text-purple-600" />
                    Product Manager *
                  </label>
                  <div className="relative" ref={pmDropdownRef}>
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
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {getAvailableProductManagers().map((consultant) => {
                          const availability = consultantAvailability[consultant.id];

                          return (
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
                              <div>
                                <div className="font-medium text-foreground text-sm">{consultant.name || consultant.email}</div>
                                {consultant.email && consultant.name && (
                                  <div className="text-xs text-gray-600">{consultant.email}</div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Availability Indicator */}
                                {loadingAvailability ? (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                    <FaClock className="w-2 h-2 animate-spin" />
                                    <span className="text-xs">Loading...</span>
                                  </div>
                                ) : availability ? (
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    availability.availabilityColor
                                  }`}>
                                    {availability.availabilityStatus === 'available' && (
                                      <FaCheckCircle className="w-2 h-2" />
                                    )}
                                    {availability.availabilityStatus === 'partially-busy' && (
                                      <FaClock className="w-2 h-2" />
                                    )}
                                    {(availability.availabilityStatus === 'busy' || availability.availabilityStatus === 'overloaded') && (
                                      <FaExclamationTriangle className="w-2 h-2" />
                                    )}
                                    <span>{availability.averageHoursPerWeek}h/wk</span>
                                  </div>
                                ) : durationWeeks ? (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                    <FaCheckCircle className="w-2 h-2" />
                                    <span>0h/wk</span>
                                  </div>
                                ) : null}

                                {selectedProductManagerId === consultant.id && (
                                  <FaCheck className="w-3 h-3 text-green-600" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {getAvailableProductManagers().length === 0 && (
                          <div className="px-3 py-2 text-muted-foreground text-sm">No consultants found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Members Selection */}
                <div>
                  <label className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                    <FaUsers className="w-3 h-3 text-purple-600" />
                    Team Members
                  </label>
                  
                  {/* Selected Consultants Display */}
                  {selectedConsultantIds.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedConsultantIds.map((consultantId) => {
                          const consultant = allConsultants.find(c => c.id === consultantId);
                          const availability = consultantAvailability[consultantId];

                          return (
                            <div key={consultantId} className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              <span>{consultant?.name}</span>
                              {availability && (
                                <span className={`px-1 py-0.5 rounded text-xs ${
                                  availability.availabilityStatus === 'available' ? 'bg-green-200 text-green-800' :
                                  availability.availabilityStatus === 'partially-busy' ? 'bg-yellow-200 text-yellow-800' :
                                  availability.availabilityStatus === 'busy' ? 'bg-orange-200 text-orange-800' :
                                  'bg-red-200 text-red-800'
                                }`}>
                                  {availability.averageHoursPerWeek}h/wk
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeConsultant(consultantId)}
                                className="hover:text-blue-600"
                              >
                                <FaTimes className="w-2 h-2" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Availability Legend */}
                  {durationWeeks && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-card-foreground mb-2">Availability Legend for Project Period:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span>Available (≤15h/week)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span>Partially Busy (16-30h)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          <span>Busy (31-40h)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span>Overloaded (40h+)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative" ref={consultantDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={consultantSearchQuery}
                        onChange={(e) => {
                          setConsultantSearchQuery(e.target.value);
                          setShowConsultantDropdown(true);
                        }}
                        onFocus={() => setShowConsultantDropdown(true)}
                        className="block w-full px-3 py-2 pr-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 text-foreground shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                        placeholder="Search and select consultants..."
                      />
                      <FaSearch className="absolute right-3 top-3 h-3 w-3 text-muted-foreground" />
                    </div>

                    {showConsultantDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {getAvailableConsultants().length === 0 ? (
                          <div className="px-3 py-2 text-muted-foreground text-sm">No available consultants found</div>
                        ) : (
                          getAvailableConsultants().map((consultant) => {
                            const availability = consultantAvailability[consultant.id];

                            return (
                              <button
                                key={consultant.id}
                                type="button"
                                onClick={() => {
                                  setSelectedConsultantIds(prev => [...prev, consultant.id]);
                                  setConsultantAllocations(prev => ({ ...prev, [consultant.id]: 0 }));
                                  setConsultantSearchQuery('');
                                  setShowConsultantDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-foreground text-sm">{consultant.name}</div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">{consultant.email}</div>
                                    </div>

                                    {/* Availability Indicator */}
                                    <div className="ml-2 flex flex-col items-end gap-1">
                                      {loadingAvailability ? (
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                          <FaClock className="w-2 h-2 animate-spin" />
                                          <span className="text-xs">Loading...</span>
                                        </div>
                                      ) : availability ? (
                                        <>
                                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                            availability.availabilityColor
                                          }`}>
                                            {availability.availabilityStatus === 'available' && (
                                              <FaCheckCircle className="w-2 h-2" />
                                            )}
                                            {availability.availabilityStatus === 'partially-busy' && (
                                              <FaClock className="w-2 h-2" />
                                            )}
                                            {(availability.availabilityStatus === 'busy' || availability.availabilityStatus === 'overloaded') && (
                                              <FaExclamationTriangle className="w-2 h-2" />
                                            )}
                                            <span>{availability.averageHoursPerWeek}h/wk avg</span>
                                          </div>
                                          <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                            {Math.round(availability.totalAvailable || 0)}h available
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          {durationWeeks ? 'No data' : 'Set duration'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hour Allocation Section */}
            {(selectedProductManagerId || selectedConsultantIds.length > 0) && (
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center">
                    <FaClock className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Hour Allocation</h2>
                </div>
                <div className="space-y-3">
                  {/* Product Manager Allocation */}
                  {selectedProductManagerId && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-800/20 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className="w-10 h-10 bg-purple-600 dark:bg-purple-700 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4 flex-shrink-0">
                            <FaUser className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                              {getSelectedProductManager()?.name || getSelectedProductManager()?.email}
                              <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded-full font-medium">
                                Product Manager
                              </span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-sm text-muted-foreground">{getSelectedProductManager()?.email}</p>
                              {consultantAvailability[selectedProductManagerId] && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  consultantAvailability[selectedProductManagerId].availabilityColor
                                }`}>
                                  {consultantAvailability[selectedProductManagerId].averageHoursPerWeek}h/wk avg
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const constraints = getConsultantConstraints(selectedProductManagerId);
                              const currentHours = consultantAllocations[selectedProductManagerId] || 0;
                              const hasValidationError = currentHours < constraints.minimumHours;
                              const exceedsAvailability = consultantAvailability[selectedProductManagerId] &&
                                currentHours > Math.round(consultantAvailability[selectedProductManagerId].totalAvailable || 0);

                              return (
                                <>
                                  <input
                                    type="number"
                                    min={constraints.minimumHours}
                                    value={currentHours || ''}
                                    onChange={(e) => updateConsultantAllocation(selectedProductManagerId, parseInt(e.target.value) || 0)}
                                    className={`w-20 px-2 py-1 rounded-lg border-2 ${
                                      hasValidationError
                                        ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : exceedsAvailability
                                        ? 'border-yellow-500 dark:border-yellow-500'
                                        : 'border-gray-200 dark:border-gray-600'
                                    } dark:bg-gray-900 text-foreground text-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50`}
                                    placeholder={constraints.minimumHours > 0 ? String(constraints.minimumHours) : "0"}
                                  />
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">hours</span>
                                  {constraints.minimumHours > 0 && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                                      (min: {constraints.minimumHours}h)
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                            {(() => {
                              const constraints = getConsultantConstraints(selectedProductManagerId);
                              return constraints.canRemove ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductManagerId('');
                                    setPmSearchQuery('');
                                    const newAllocations = { ...consultantAllocations };
                                    delete newAllocations[selectedProductManagerId];
                                    setConsultantAllocations(newAllocations);
                                  }}
                                  className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center"
                                  title="Remove Product Manager"
                                >
                                  <FaTimes className="w-3 h-3" />
                                </button>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center" title={`Cannot remove: ${constraints.minimumHours}h committed`}>
                                  <FaTimes className="w-3 h-3" />
                                </div>
                              );
                            })()}
                          </div>
                          {(() => {
                            const constraints = getConsultantConstraints(selectedProductManagerId);
                            const currentHours = consultantAllocations[selectedProductManagerId] || 0;
                            const hasValidationError = currentHours < constraints.minimumHours;
                            const exceedsAvailability = consultantAvailability[selectedProductManagerId] &&
                              currentHours > Math.round(consultantAvailability[selectedProductManagerId].totalAvailable || 0);

                            if (hasValidationError) {
                              return (
                                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                                  <FaExclamationTriangle className="w-3 h-3" />
                                  <span>
                                    Cannot reduce below {constraints.minimumHours}h (already allocated in phases)
                                  </span>
                                </div>
                              );
                            }

                            if (exceedsAvailability) {
                              return (
                                <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                                  <FaExclamationTriangle className="w-3 h-3" />
                                  <span>
                                    Exceeds availability by {currentHours - Math.round(consultantAvailability[selectedProductManagerId].totalAvailable || 0)}h
                                  </span>
                                </div>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team Consultants Allocation */}
                  {selectedConsultantIds.map(consultantId => {
                    const consultant = allConsultants.find(c => c.id === consultantId);
                    const availability = consultantAvailability[consultantId];
                    if (!consultant) return null;

                    return (
                      <div key={consultantId} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4 flex-shrink-0">
                              {consultant.name?.charAt(0) || consultant.email?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground">
                                {consultant.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-sm text-muted-foreground">{consultant.email}</p>
                                {availability && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    availability.availabilityColor
                                  }`}>
                                    {availability.averageHoursPerWeek}h/wk avg
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const constraints = getConsultantConstraints(consultantId);
                                const currentHours = consultantAllocations[consultantId] || 0;
                                const hasValidationError = currentHours < constraints.minimumHours;
                                const exceedsAvailability = availability &&
                                  currentHours > Math.round(availability.totalAvailable || 0);

                                return (
                                  <>
                                    <input
                                      type="number"
                                      min={constraints.minimumHours}
                                      value={currentHours || ''}
                                      onChange={(e) => updateConsultantAllocation(consultantId, parseInt(e.target.value) || 0)}
                                      className={`w-20 px-2 py-1 rounded-lg border-2 ${
                                        hasValidationError
                                          ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                                          : exceedsAvailability
                                          ? 'border-yellow-500 dark:border-yellow-500'
                                          : 'border-gray-200 dark:border-gray-600'
                                      } dark:bg-gray-900 text-foreground text-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50`}
                                      placeholder={constraints.minimumHours > 0 ? String(constraints.minimumHours) : "0"}
                                    />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">hours</span>
                                    {constraints.minimumHours > 0 && (
                                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                                        (min: {constraints.minimumHours}h)
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                              {(() => {
                                const constraints = getConsultantConstraints(consultantId);
                                return constraints.canRemove ? (
                                  <button
                                    type="button"
                                    onClick={() => removeConsultant(consultantId)}
                                    className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center"
                                    title="Remove Consultant"
                                  >
                                    <FaTimes className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center" title={`Cannot remove: ${constraints.minimumHours}h committed`}>
                                    <FaTimes className="w-3 h-3" />
                                  </div>
                                );
                              })()}
                            </div>
                            {(() => {
                              const constraints = getConsultantConstraints(consultantId);
                              const currentHours = consultantAllocations[consultantId] || 0;
                              const hasValidationError = currentHours < constraints.minimumHours;
                              const exceedsAvailability = availability &&
                                currentHours > Math.round(availability.totalAvailable || 0);

                              if (hasValidationError) {
                                return (
                                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                                    <FaExclamationTriangle className="w-3 h-3" />
                                    <span>
                                      Cannot reduce below {constraints.minimumHours}h (already allocated in phases)
                                    </span>
                                  </div>
                                );
                              }

                              if (exceedsAvailability) {
                                return (
                                  <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                                    <FaExclamationTriangle className="w-3 h-3" />
                                    <span>
                                      Exceeds availability by {currentHours - Math.round(availability.totalAvailable || 0)}h
                                    </span>
                                  </div>
                                );
                              }

                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}
          </form>

          {/* Consultant Weekly Schedule */}
          {startDate && endDate && (selectedProductManagerId || selectedConsultantIds.length > 0) && (
            <div className="mt-6 px-6">
              <ConsultantScheduleView
                startDate={startDate}
                endDate={endDate}
                selectedConsultantIds={[selectedProductManagerId, ...selectedConsultantIds].filter(id => id)}
              />
            </div>
          )}

          {/* Bottom spacing before footer */}
          <div className="h-6"></div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
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
              className="px-4 py-2 text-gray-600 hover:text-foreground font-medium transition-colors duration-200"
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