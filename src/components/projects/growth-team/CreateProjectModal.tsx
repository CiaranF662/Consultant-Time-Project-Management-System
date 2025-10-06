'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { User } from '@prisma/client';
import { FaInfoCircle, FaSearch, FaTimes, FaUser, FaUsers, FaCalendarAlt, FaBriefcase, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInWeeks, setDurationInWeeks] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [budgetedHours, setBudgetedHours] = useState('');
  
  // Product Manager and Consultants
  const [consultants, setConsultants] = useState<User[]>([]);
  const [selectedProductManagerId, setSelectedProductManagerId] = useState<string>('');
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [consultantAllocations, setConsultantAllocations] = useState<Record<string, number>>({});

  // Search functionality
  const [pmSearchQuery, setPmSearchQuery] = useState('');
  const [consultantSearchQuery, setConsultantSearchQuery] = useState('');
  const [showPmDropdown, setShowPmDropdown] = useState(false);
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false);

  // Consultant availability state
  const [consultantAvailability, setConsultantAvailability] = useState<Record<string, any>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Refs for click-outside functionality
  const pmDropdownRef = useRef<HTMLDivElement>(null);
  const consultantDropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form
      setTitle('');
      setDescription('');
      setDurationInWeeks('');
      setStartDate(getTodayString());
      setBudgetedHours('');
      setSelectedProductManagerId('');
      setSelectedConsultantIds([]);
      setConsultantAllocations({});
      setPmSearchQuery('');
      setConsultantSearchQuery('');
      setShowPmDropdown(false);
      setShowConsultantDropdown(false);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Fetch all consultants when the component mounts
  useEffect(() => {
    if (isOpen) {
      const fetchConsultants = async () => {
        try {
          const { data } = await axios.get('/api/users?role=CONSULTANT');
          setConsultants(data);
        } catch (err) {
          setError('Failed to load consultants.');
        }
      };
      fetchConsultants();
    }
  }, [isOpen]);

  // Fetch consultant availability when start date or duration changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchAvailability = async () => {
      if (!startDate || !durationInWeeks || parseInt(durationInWeeks) <= 0) {
        setConsultantAvailability({});
        return;
      }

      setLoadingAvailability(true);
      try {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + (parseInt(durationInWeeks) * 7) - 1);

        const response = await axios.get('/api/consultants/availability', {
          params: {
            startDate: start.toISOString(),
            endDate: end.toISOString()
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

          acc[item.consultant.id] = {
            ...item,
            availabilityStatus,
            availabilityColor
          };
          return acc;
        }, {});

        setConsultantAvailability(availabilityMap);
      } catch (err) {
        console.error('Failed to fetch consultant availability:', err);
        setConsultantAvailability({});
      } finally {
        setLoadingAvailability(false);
      }
    };

    const timeoutId = setTimeout(fetchAvailability, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, startDate, durationInWeeks]);

  // Click outside handler for dropdowns and modal
  useEffect(() => {
    if (!isOpen) return;

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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter consultants based on search query
  const getFilteredConsultants = (searchQuery: string, excludeIds: string[] = []) => {
    if (!searchQuery.trim()) return consultants.filter(c => !excludeIds.includes(c.id));
    
    return consultants.filter(consultant => {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = consultant.name?.toLowerCase().includes(searchLower);
      const emailMatch = consultant.email?.toLowerCase().includes(searchLower);
      return (nameMatch || emailMatch) && !excludeIds.includes(consultant.id);
    });
  };

  const handleProductManagerSelect = (consultantId: string) => {
    setSelectedProductManagerId(consultantId);
    const selectedConsultant = consultants.find(c => c.id === consultantId);
    setPmSearchQuery(selectedConsultant?.name || selectedConsultant?.email || '');
    setShowPmDropdown(false);

   
    if (!(consultantId in consultantAllocations)) {
      setConsultantAllocations(prev => ({
        ...prev,
        [consultantId]: 0
      }));
    }
  };

  const handleConsultantToggle = (consultantId: string) => {
    setSelectedConsultantIds(prev => {
      const isCurrentlySelected = prev.includes(consultantId);
      if (isCurrentlySelected) {
        // Remove consultant and their allocation
        const newAllocations = { ...consultantAllocations };
        delete newAllocations[consultantId];
        setConsultantAllocations(newAllocations);
        return prev.filter(id => id !== consultantId);
      } else {
        // Add consultant and initialize their allocation
        setConsultantAllocations(prevAllocations => ({
          ...prevAllocations,
          [consultantId]: 0
        }));
        return [...prev, consultantId];
      }
    });
  };

  const removeConsultant = (consultantId: string) => {
    setSelectedConsultantIds(prev => prev.filter(id => id !== consultantId));
    const newAllocations = { ...consultantAllocations };
    delete newAllocations[consultantId];
    setConsultantAllocations(newAllocations);
  };

  const handleAllocationChange = (consultantId: string, hours: number) => {
    setConsultantAllocations(prev => ({
      ...prev,
      [consultantId]: hours
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (!selectedProductManagerId) {
      setError('You must assign a Product Manager to the project.');
      setIsLoading(false);
      return;
    }

    if (selectedConsultantIds.length === 0) {
      setError('You must assign at least one consultant to the project.');
      setIsLoading(false);
      return;
    }

    // Validate consultant allocations (including Product Manager)
    const allTeamMemberIds = [selectedProductManagerId, ...selectedConsultantIds];
    const totalAllocatedHours = allTeamMemberIds.reduce((sum, id) => {
      return sum + (consultantAllocations[id] || 0);
    }, 0);

    if (totalAllocatedHours === 0) {
      setError('You must allocate hours to at least one team member (including Product Manager).');
      setIsLoading(false);
      return;
    }

    // Check for team members with zero hours
    const teamMembersWithoutHours = allTeamMemberIds.filter(id => !consultantAllocations[id] || consultantAllocations[id] <= 0);
    if (teamMembersWithoutHours.length > 0) {
      setError('All team members (including Product Manager) must have allocated hours greater than 0.');
      setIsLoading(false);
      return;
    }

    if (!budgetedHours || parseInt(budgetedHours, 10) <= 0) {
      setError('You must specify a valid budget in hours.');
      setIsLoading(false);
      return;
    }

    if (parseInt(durationInWeeks, 10) <= 0) {
      setError('Duration must be at least 1 week.');
      setIsLoading(false);
      return;
    }

    // Warn if total allocated hours exceed budget
    const budget = parseInt(budgetedHours, 10);
    if (totalAllocatedHours > budget) {
      if (!confirm(`Total allocated hours (${totalAllocatedHours}) exceed project budget (${budget}). Do you want to continue?`)) {
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await axios.post('/api/projects', {
        title,
        description,
        startDate,
        durationInWeeks: parseInt(durationInWeeks, 10),
        budgetedHours: parseInt(budgetedHours, 10),
        productManagerId: selectedProductManagerId,
        consultantIds: selectedConsultantIds,
        consultantAllocations: consultantAllocations,
      });

      if (response.status === 201) {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
        router.push(`/dashboard/projects/${response.data.id}`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate suggested budget based on duration and team size
  const getSuggestedBudget = () => {
    if (!durationInWeeks || selectedConsultantIds.length === 0) return 0;
    
    const weeks = parseInt(durationInWeeks, 10) || 0;
    const teamSize = selectedConsultantIds.length;
    const averageHoursPerWeek = 30; // Conservative estimate
    
    return weeks * teamSize * averageHoursPerWeek;
  };

  const suggestedBudget = getSuggestedBudget();

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <FaBriefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create New Project</h1>
              <p className="text-blue-100">Set up a new project with professional resource allocation</p>
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
                  {[selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)} / {budgetedHours} hours
                  <span className="ml-2 text-xs">
                    ({Math.round(([selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0) / parseInt(budgetedHours)) * 100)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    ([selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0) / parseInt(budgetedHours)) > 1
                      ? 'bg-gradient-to-r from-red-500 to-red-600' // Over budget
                      : ([selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0) / parseInt(budgetedHours)) >= 0.8
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500' // Almost full
                      : 'bg-gradient-to-r from-green-500 to-blue-500' // Good
                  }`}
                  style={{
                    width: `${Math.min(([selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0) / parseInt(budgetedHours)) * 100, 100)}%`
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={`font-medium ${
                  parseInt(budgetedHours) >= [selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)
                    ? 'text-green-700'
                    : 'text-red-700'
                }`}>
                  Remaining: {parseInt(budgetedHours) - [selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)} hours
                </span>
                <span className="text-gray-600">
                  Team Members: {[selectedProductManagerId, ...selectedConsultantIds].filter(id => id).length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            
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
                      className="block w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                      required
                      placeholder="e.g., Website Redesign Project"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-semibold text-card-foreground mb-2">
                      Project Description
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 resize-none"
                      placeholder="Describe the project objectives, scope, and expected outcomes..."
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                      <FaCalendarAlt className="w-3 h-3 text-green-600" />
                      Start Date *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="durationInWeeks" className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                      <FaClock className="w-3 h-3 text-purple-600" />
                      Duration (weeks) *
                    </label>
                    <input
                      type="number"
                      id="durationInWeeks"
                      value={durationInWeeks}
                      onChange={(e) => setDurationInWeeks(e.target.value)}
                      className="block w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                      min="1"
                      required
                      placeholder="12"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Planning */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-800/20 p-6 rounded-lg border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <FaClock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Budget Planning</h2>
              </div>
              
              <div>
                <label htmlFor="budgetedHours" className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                  <FaClock className="w-3 h-3 text-green-600" />
                  Total Budgeted Hours *
                </label>
                <div className="flex rounded-lg shadow-sm">
                  <input
                    type="number"
                    id="budgetedHours"
                    value={budgetedHours}
                    onChange={(e) => setBudgetedHours(e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 rounded-l-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                    min="1"
                    required
                    placeholder="480"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-lg border-2 border-l-0 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-card-foreground font-medium text-sm">
                    hours
                  </span>
                </div>
                
                {suggestedBudget > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <FaInfoCircle className="w-3 h-3" />
                      <span className="font-medium">Suggested budget: {suggestedBudget} hours</span>
                    </div>
                    {!budgetedHours && (
                      <button
                        type="button"
                        onClick={() => setBudgetedHours(suggestedBudget.toString())}
                        className="mt-2 text-sm text-blue-600 dark:text-blue-400 underline hover:no-underline font-medium"
                      >
                        Use this suggestion
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Team Assignment */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-800/20 p-6 rounded-lg border border-purple-100 dark:border-purple-800">
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
                    <div className="relative">
                      <input
                        type="text"
                        value={pmSearchQuery}
                        onChange={(e) => {
                          setPmSearchQuery(e.target.value);
                          setShowPmDropdown(true);
                        }}
                        onFocus={() => setShowPmDropdown(true)}
                        className="block w-full px-3 py-2 pr-8 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:placeholder-gray-400 text-foreground shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                        placeholder="Search for a Product Manager..."
                        required
                      />
                      <FaSearch className="absolute right-3 top-3 h-3 w-3 text-muted-foreground" />
                    </div>

                    {showPmDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {getFilteredConsultants(pmSearchQuery, selectedConsultantIds).length === 0 ? (
                          <div className="px-3 py-2 text-muted-foreground text-sm">No consultants found</div>
                        ) : (
                          getFilteredConsultants(pmSearchQuery, selectedConsultantIds).map((consultant) => {
                            const availability = consultantAvailability[consultant.id];

                            return (
                              <button
                                key={consultant.id}
                                type="button"
                                onClick={() => handleProductManagerSelect(consultant.id)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-foreground text-sm">{consultant.name}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{consultant.email}</div>
                                  </div>

                                  {/* Availability Indicator */}
                                  <div className="ml-2">
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
                                    ) : startDate && durationInWeeks ? (
                                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                        <FaCheckCircle className="w-2 h-2" />
                                        <span>0h/wk</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Set dates</span>
                                    )}
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

                {/* Team Consultants Selection */}
                <div>
                  <label className="block text-sm font-semibold text-card-foreground mb-2 flex items-center gap-2">
                    <FaUsers className="w-3 h-3 text-blue-600" />
                    Team Consultants *
                  </label>
                  
                  {/* Selected Consultants Display */}
                  {selectedConsultantIds.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedConsultantIds.map((consultantId) => {
                          const consultant = consultants.find(c => c.id === consultantId);
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
                  {startDate && durationInWeeks && (
                    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
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
                        {getFilteredConsultants(consultantSearchQuery, [selectedProductManagerId, ...selectedConsultantIds]).length === 0 ? (
                          <div className="px-3 py-2 text-muted-foreground text-sm">No available consultants found</div>
                        ) : (
                          getFilteredConsultants(consultantSearchQuery, [selectedProductManagerId, ...selectedConsultantIds]).map((consultant) => {
                            const availability = consultantAvailability[consultant.id];

                            return (
                              <button
                                key={consultant.id}
                                type="button"
                                onClick={() => {
                                  handleConsultantToggle(consultant.id);
                                  setConsultantSearchQuery('');
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:bg-blue-50 dark:focus:bg-blue-900/30 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-foreground text-sm">{consultant.name}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{consultant.email}</div>
                                  </div>

                                  {/* Availability Indicator */}
                                  <div className="ml-2">
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
                                    ) : startDate && durationInWeeks ? (
                                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                        <FaCheckCircle className="w-2 h-2" />
                                        <span>0h/wk</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Set dates</span>
                                    )}
                                  </div>
                                </div>

                                {/* Detailed availability info */}
                                {availability && availability.projectAllocations && Object.keys(availability.projectAllocations).length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-600 mb-1">Current projects:</p>
                                    <div className="space-y-1">
                                      {Object.entries(availability.projectAllocations).slice(0, 2).map(([projectTitle, hours]: [string, any]) => (
                                        <div key={projectTitle} className="text-xs text-muted-foreground flex justify-between">
                                          <span className="truncate max-w-[120px]">{projectTitle}</span>
                                          <span>{hours}h</span>
                                        </div>
                                      ))}
                                      {Object.keys(availability.projectAllocations).length > 2 && (
                                        <div className="text-xs text-muted-foreground">+{Object.keys(availability.projectAllocations).length - 2} more projects</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hour Allocation Section */}
                {(selectedProductManagerId || selectedConsultantIds.length > 0) && (
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-800/20 p-6 rounded-lg border border-orange-100 dark:border-orange-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center">
                        <FaClock className="w-4 h-4" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Initial Hour Allocation</h2>
                    </div>

                    <div className="space-y-3">
                      {/* Product Manager Allocation */}
                      {selectedProductManagerId && (
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-800/20 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-purple-600 dark:bg-purple-700 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4">
                                <FaUser className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground flex items-center gap-2">
                                  {consultants.find(c => c.id === selectedProductManagerId)?.name}
                                  <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded-full font-medium">
                                    Product Manager
                                  </span>
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm text-muted-foreground">{consultants.find(c => c.id === selectedProductManagerId)?.email}</p>
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
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={consultantAllocations[selectedProductManagerId] || ''}
                                onChange={(e) => handleAllocationChange(selectedProductManagerId, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 text-foreground text-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50"
                                placeholder="0"
                              />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">hours</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Team Consultants Allocation */}
                      {selectedConsultantIds.map(consultantId => {
                        const consultant = consultants.find(c => c.id === consultantId);
                        const availability = consultantAvailability[consultantId];
                        if (!consultant) return null;

                        return (
                          <div key={consultantId} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 shadow-sm">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4">
                                {consultant.name?.charAt(0) || consultant.email?.charAt(0) || 'U'}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{consultant.name}</p>
                                <div className="flex items-center gap-2 mt-1">
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
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={consultantAllocations[consultantId] || ''}
                                onChange={(e) => handleAllocationChange(consultantId, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 text-foreground text-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50"
                                placeholder="0"
                              />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">hours</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Allocation Summary */}
                    {Object.keys(consultantAllocations).length > 0 && (
                      <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            All allocations are tracked in the progress indicator above
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Scroll up to see budget progress and remaining hours
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Team Summary */}
                {(selectedProductManagerId || selectedConsultantIds.length > 0) && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2 text-sm">
                      <FaUsers className="w-3 h-3" />
                      Team Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {selectedProductManagerId && (
                        <div className="flex items-center gap-2">
                          <FaUser className="w-3 h-3 text-purple-600" />
                          <span className="font-medium text-card-foreground">PM:</span>
                          <span className="text-foreground">{consultants.find(c => c.id === selectedProductManagerId)?.name}</span>
                        </div>
                      )}
                      {selectedConsultantIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FaUsers className="w-3 h-3 text-blue-600" />
                          <span className="font-medium text-card-foreground">Team Size:</span>
                          <span className="text-foreground">{selectedConsultantIds.length} consultant(s)</span>
                        </div>
                      )}
                      {budgetedHours && (
                        <div className="flex items-center gap-2">
                          <FaClock className="w-3 h-3 text-green-600" />
                          <span className="font-medium text-card-foreground">Project Budget:</span>
                          <span className="text-foreground">{budgetedHours} hours</span>
                        </div>
                      )}
                      {Object.keys(consultantAllocations).length > 0 && (
                        <div className="flex items-center gap-2">
                          <FaClock className="w-3 h-3 text-orange-600" />
                          <span className="font-medium text-card-foreground">Total Allocated:</span>
                          <span className="text-foreground">{[selectedProductManagerId, ...selectedConsultantIds].reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)} hours</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-card-foreground hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-project-form"
            onClick={handleSubmit}
            disabled={isLoading}
            className="py-2 px-6 border-2 border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}