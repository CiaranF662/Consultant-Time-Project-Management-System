// src/app/(dashboard)/dashboard/create-project/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { User } from '@prisma/client';
import { FaInfoCircle, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// Helper function to get the next Monday from a given date (or same date if already Monday)
const getNextMonday = (date: Date) => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  if (dayOfWeek === 1) return new Date(date); // Already Monday
  const daysUntilMonday = (1 + 7 - dayOfWeek) % 7;
  const nextMonday = new Date(date);
  nextMonday.setDate(date.getDate() + daysUntilMonday);
  return nextMonday;
};

// Helper function to format date for input
const formatDateForInput = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export default function CreateProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInWeeks, setDurationInWeeks] = useState('');

  // Calculate next Monday as default start date
  const today = new Date();
  const nextMonday = getNextMonday(today);
  const [startDate, setStartDate] = useState(formatDateForInput(nextMonday));
  const [budgetedHours, setBudgetedHours] = useState('');

  // Check if start date was adjusted from today
  const isStartDateAdjusted = formatDateForInput(today) !== formatDateForInput(nextMonday);
  
  // Product Manager and Consultants
  const [consultants, setConsultants] = useState<User[]>([]);
  const [selectedProductManagerId, setSelectedProductManagerId] = useState<string>('');
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [consultantAllocations, setConsultantAllocations] = useState<Record<string, number>>({});

  // Consultant availability state
  const [consultantAvailability, setConsultantAvailability] = useState<Record<string, any>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all consultants when the component mounts
  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const { data } = await axios.get('/api/users?role=CONSULTANT');
        setConsultants(data);
      } catch (err) {
        setError('Failed to load consultants.');
      }
    };
    fetchConsultants();
  }, []);

  // Fetch consultant availability when start date or duration changes
  useEffect(() => {
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

        // Convert array to object keyed by consultant ID
        const availabilityMap = response.data.reduce((acc: any, item: any) => {
          acc[item.consultant.id] = item;
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

    const timeoutId = setTimeout(fetchAvailability, 300); // Debounce API calls
    return () => clearTimeout(timeoutId);
  }, [startDate, durationInWeeks]);


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

    // Validate consultant allocations
    const totalAllocatedHours = selectedConsultantIds.reduce((sum, id) => {
      return sum + (consultantAllocations[id] || 0);
    }, 0);

    if (totalAllocatedHours === 0) {
      setError('You must allocate hours to at least one consultant.');
      setIsLoading(false);
      return;
    }

    // Check for consultants with zero hours
    const consultantsWithoutHours = selectedConsultantIds.filter(id => !consultantAllocations[id] || consultantAllocations[id] <= 0);
    if (consultantsWithoutHours.length > 0) {
      setError('All selected consultants must have allocated hours greater than 0.');
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

  return (
    
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Create New Project</h1>
              <p className="text-lg text-gray-600 mt-1">
                Set up a new project with resource allocation and budget planning.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 shadow-md rounded-lg border border-gray-200">
              <div className="space-y-6">
                
                {/* Basic Project Information */}
                <div className="border-b pb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Project Details</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-card-foreground">
                        Project Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="e.g., Website Redesign Project"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-card-foreground">
                        Description
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Describe the project objectives, scope, and expected outcomes..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-card-foreground">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          id="startDate"
                          value={startDate}
                          onChange={(e) => {
                            const selectedDate = new Date(e.target.value);
                            const adjustedDate = getNextMonday(selectedDate);
                            setStartDate(formatDateForInput(adjustedDate));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                        {isStartDateAdjusted && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                            <FaInfoCircle className="w-4 h-4" />
                            <span>Project start date adjusted to Monday ({new Date(startDate).toLocaleDateString()}) as projects must begin on a Monday.</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="durationInWeeks" className="block text-sm font-medium text-card-foreground">
                          Duration (weeks) *
                        </label>
                        <input
                          type="number"
                          id="durationInWeeks"
                          value={durationInWeeks}
                          onChange={(e) => setDurationInWeeks(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          min="1"
                          required
                          placeholder="12"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Budget Planning */}
                <div className="border-b pb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Budget Planning</h2>
                  
                  <div>
                    <label htmlFor="budgetedHours" className="block text-sm font-medium text-card-foreground">
                      Total Budgeted Hours *
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        id="budgetedHours"
                        value={budgetedHours}
                        onChange={(e) => setBudgetedHours(e.target.value)}
                        className="flex-1 rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        min="1"
                        required
                        placeholder="480"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-muted-foreground text-sm">
                        hours
                      </span>
                    </div>
                    
                    {suggestedBudget > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                        <FaInfoCircle className="w-4 h-4" />
                        <span>Suggested budget based on team and duration: {suggestedBudget} hours</span>
                        {!budgetedHours && (
                          <button
                            type="button"
                            onClick={() => setBudgetedHours(suggestedBudget.toString())}
                            className="underline hover:no-underline"
                          >
                            Use suggestion
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Assignment */}
                <div className="border-b pb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Team Assignment</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="productManager" className="block text-sm font-medium text-card-foreground">
                        Product Manager *
                      </label>
                      <select
                        id="productManager"
                        value={selectedProductManagerId}
                        onChange={(e) => setSelectedProductManagerId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Product Manager</option>
                        {consultants.map(consultant => (
                          <option key={consultant.id} value={consultant.id}>
                            {consultant.name} ({consultant.email})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The Product Manager will be responsible for phase planning and hour allocation.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="consultants" className="block text-sm font-medium text-card-foreground">
                        Team Consultants *
                      </label>
                      <div className="mt-1 space-y-2">
                        {consultants.map(consultant => {
                          const availability = consultantAvailability[consultant.id];
                          const isSelected = selectedConsultantIds.includes(consultant.id);

                          return (
                            <div key={consultant.id} className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              const isCurrentlySelected = selectedConsultantIds.includes(consultant.id);
                              if (isCurrentlySelected) {
                                setSelectedConsultantIds(prev => prev.filter(id => id !== consultant.id));
                                setConsultantAllocations(prev => {
                                  const newAllocations = { ...prev };
                                  delete newAllocations[consultant.id];
                                  return newAllocations;
                                });
                              } else {
                                setSelectedConsultantIds(prev => [...prev, consultant.id]);
                                setConsultantAllocations(prev => ({
                                  ...prev,
                                  [consultant.id]: 0
                                }));
                              }
                            }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <FaCheckCircle className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{consultant.name}</p>
                                    <p className="text-xs text-muted-foreground">{consultant.email}</p>
                                  </div>
                                </div>

                                {/* Availability Indicator */}
                                <div className="flex items-center gap-2">
                                  {loadingAvailability ? (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                      <FaClock className="w-3 h-3 animate-spin" />
                                      <span className="text-xs">Loading...</span>
                                    </div>
                                  ) : availability ? (
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                      availability.availabilityColor
                                    }`}>
                                      {availability.availabilityStatus === 'available' && (
                                        <FaCheckCircle className="w-3 h-3" />
                                      )}
                                      {availability.availabilityStatus === 'partially-busy' && (
                                        <FaClock className="w-3 h-3" />
                                      )}
                                      {(availability.availabilityStatus === 'busy' || availability.availabilityStatus === 'overloaded') && (
                                        <FaExclamationTriangle className="w-3 h-3" />
                                      )}
                                      <span>{availability.availabilityLabel}</span>
                                      <span className="ml-1">({availability.averageHoursPerWeek}h/wk)</span>
                                    </div>
                                  ) : startDate && durationInWeeks ? (
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                      <FaCheckCircle className="w-3 h-3" />
                                      <span>Available (0h/wk)</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Set project dates</span>
                                  )}
                                </div>
                              </div>

                              {/* Availability Details */}
                              {availability && availability.projectAllocations && Object.keys(availability.projectAllocations).length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-600 mb-1">Current allocations:</p>
                                  <div className="space-y-1">
                                    {Object.entries(availability.projectAllocations).map(([projectTitle, hours]: [string, any]) => (
                                      <div key={projectTitle} className="text-xs text-muted-foreground flex justify-between">
                                        <span className="truncate">{projectTitle}</span>
                                        <span>{hours}h</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click consultants to select them for the project. Availability shows their current workload during the project period.
                      </p>

                      {/* Availability Legend */}
                      {startDate && durationInWeeks && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-card-foreground mb-2">Availability Legend:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span>Available (≤15h/week)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span>Partially Busy (16-30h/week)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                              <span>Busy (31-40h/week)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span>Overloaded (40h+/week)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hour Allocation Section */}
                    {selectedConsultantIds.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-md font-medium text-foreground mb-3">Initial Hour Allocation</h3>
                        <div className="space-y-3">
                          {selectedConsultantIds.map(consultantId => {
                            const consultant = consultants.find(c => c.id === consultantId);
                            if (!consultant) return null;

                            return (
                              <div key={consultantId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                                    {consultant.name?.charAt(0) || consultant.email?.charAt(0) || 'U'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{consultant.name}</p>
                                    <p className="text-xs text-muted-foreground">{consultant.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={consultantAllocations[consultantId] || ''}
                                    onChange={(e) => handleAllocationChange(consultantId, parseInt(e.target.value) || 0)}
                                    className="w-24 rounded-md border-gray-300 text-sm"
                                    placeholder="0"
                                  />
                                  <span className="ml-2 text-sm text-muted-foreground">hours</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Allocation Summary */}
                        {Object.keys(consultantAllocations).length > 0 && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-blue-800">Total Allocated Hours:</span>
                              <span className="font-bold text-blue-900">
                                {selectedConsultantIds.reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)} hours
                              </span>
                            </div>
                            {budgetedHours && (
                              <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-blue-700">Remaining Budget:</span>
                                <span className={`font-medium ${
                                  parseInt(budgetedHours) >= selectedConsultantIds.reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)
                                    ? 'text-green-700'
                                    : 'text-red-700'
                                }`}>
                                  {parseInt(budgetedHours) - selectedConsultantIds.reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)} hours
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Team Summary */}
                    {selectedProductManagerId && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <h3 className="font-medium text-green-800 mb-2">Project Summary</h3>
                        <div className="space-y-1 text-sm">
                          <div>
                            <strong>Product Manager:</strong> {consultants.find(c => c.id === selectedProductManagerId)?.name}
                          </div>
                          {selectedConsultantIds.length > 0 && (
                            <div>
                              <strong>Team Size:</strong> {selectedConsultantIds.length} consultant(s)
                            </div>
                          )}
                          {budgetedHours && (
                            <div>
                              <strong>Project Budget:</strong> {budgetedHours} hours
                            </div>
                          )}
                          {Object.keys(consultantAllocations).length > 0 && (
                            <div>
                              <strong>Initial Allocation:</strong> {selectedConsultantIds.reduce((sum, id) => sum + (consultantAllocations[id] || 0), 0)} hours
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-4">
                <Link href="/dashboard" className="py-2 px-4 border rounded-md text-sm font-medium hover:bg-gray-50">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-2 px-6 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    
  );
}