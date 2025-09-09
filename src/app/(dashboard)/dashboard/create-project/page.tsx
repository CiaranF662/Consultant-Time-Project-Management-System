// src/app/(dashboard)/dashboard/create-project/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { User } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import { FaInfoCircle } from 'react-icons/fa';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

export default function CreateProjectPage() {
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

  const handleConsultantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedConsultantIds(selectedOptions);
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

    try {
      const response = await axios.post('/api/projects', {
        title,
        description,
        startDate,
        durationInWeeks: parseInt(durationInWeeks, 10),
        budgetedHours: parseInt(budgetedHours, 10),
        productManagerId: selectedProductManagerId,
        consultantIds: selectedConsultantIds,
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
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Create New Project</h1>
              <p className="text-lg text-gray-600 mt-1">
                Set up a new project with resource allocation and budget planning.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 shadow-md rounded-lg border border-gray-200">
              <div className="space-y-6">
                
                {/* Basic Project Information */}
                <div className="border-b pb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Project Details</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
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
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
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
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          id="startDate"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="durationInWeeks" className="block text-sm font-medium text-gray-700">
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
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Budget Planning</h2>
                  
                  <div>
                    <label htmlFor="budgetedHours" className="block text-sm font-medium text-gray-700">
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
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
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
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Team Assignment</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="productManager" className="block text-sm font-medium text-gray-700">
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
                      <p className="mt-1 text-xs text-gray-500">
                        The Product Manager will be responsible for phase planning and hour allocation.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="consultants" className="block text-sm font-medium text-gray-700">
                        Team Consultants *
                      </label>
                      <select
                        id="consultants"
                        multiple
                        value={selectedConsultantIds}
                        onChange={handleConsultantChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-32"
                        required
                      >
                        {consultants.map(consultant => (
                          <option key={consultant.id} value={consultant.id}>
                            {consultant.name} ({consultant.email})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Hold Command (Mac) or Ctrl (Windows) to select multiple consultants. These consultants will be available for phase allocation.
                      </p>
                    </div>

                    {/* Team Summary */}
                    {(selectedProductManagerId || selectedConsultantIds.length > 0) && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-medium text-blue-800 mb-2">Team Summary</h3>
                        <div className="space-y-1 text-sm">
                          {selectedProductManagerId && (
                            <div>
                              <strong>Product Manager:</strong> {consultants.find(c => c.id === selectedProductManagerId)?.name}
                            </div>
                          )}
                          {selectedConsultantIds.length > 0 && (
                            <div>
                              <strong>Team Size:</strong> {selectedConsultantIds.length} consultant(s)
                            </div>
                          )}
                          {budgetedHours && selectedConsultantIds.length > 0 && (
                            <div>
                              <strong>Average Hours per Consultant:</strong> {Math.round(parseInt(budgetedHours) / selectedConsultantIds.length)} hours
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
    </DashboardLayout>
  );
}