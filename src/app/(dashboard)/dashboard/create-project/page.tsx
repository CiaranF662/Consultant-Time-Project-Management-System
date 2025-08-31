'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { User, UserRole } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';
import { FaArrowLeft } from 'react-icons/fa';

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
  
  // State for handling consultant selection
  const [consultants, setConsultants] = useState<User[]>([]);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  const [productManagerId, setProductManagerId] = useState<string>('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all available consultants when the component mounts
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
    
    // If PM is not in selected consultants, reset PM
    if (productManagerId && !selectedOptions.includes(productManagerId)) {
      setProductManagerId('');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (selectedConsultantIds.length === 0) {
      setError('You must assign at least one consultant to the project.');
      setIsLoading(false);
      return;
    }

    if (!productManagerId) {
      setError('You must select a Product Manager.');
      setIsLoading(false);
      return;
    }

    if (!budgetedHours || parseInt(budgetedHours) <= 0) {
      setError('You must set a valid budget in hours.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/projects', {
        title,
        description,
        startDate,
        durationInWeeks: parseInt(durationInWeeks, 10),
        consultantIds: selectedConsultantIds,
        productManagerId,
        budgetedHours: parseInt(budgetedHours, 10)
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

  return (
    <DashboardLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600">
                <FaArrowLeft /> Back to Dashboard
              </Link>
            </div>
            
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Create New Project</h1>
              <p className="text-lg text-gray-600 mt-1">
                Set up a new project with budget allocation and team assignment
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 shadow-md rounded-lg border border-gray-200">
              <div className="space-y-6">
                {/* Project Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    placeholder="e.g., Q1 Marketing Campaign"
                  />
                </div>
                
                {/* Description */}
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
                    placeholder="Provide a brief description of the project goals and scope..."
                  />
                </div>

                {/* Budget Hours */}
                <div>
                  <label htmlFor="budgetedHours" className="block text-sm font-medium text-gray-700">
                    Total Budget (Hours) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" 
                    id="budgetedHours" 
                    value={budgetedHours} 
                    onChange={(e) => setBudgetedHours(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="1"
                    required
                    placeholder="e.g., 500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Total hours allocated for this project across all phases and team members
                  </p>
                </div>

                {/* Team Assignment */}
                <div>
                  <label htmlFor="consultants" className="block text-sm font-medium text-gray-700">
                    Assign Team Members <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="consultants"
                    multiple
                    value={selectedConsultantIds}
                    onChange={handleConsultantChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm h-32 focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    {consultants.map(consultant => (
                      <option key={consultant.id} value={consultant.id}>
                        {consultant.name} ({consultant.email})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple team members
                  </p>
                </div>

                {/* Product Manager Selection */}
                <div>
                  <label htmlFor="productManager" className="block text-sm font-medium text-gray-700">
                    Select Product Manager <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="productManager"
                    value={productManagerId}
                    onChange={(e) => setProductManagerId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Select a Product Manager --</option>
                    {selectedConsultantIds.length > 0 && consultants
                      .filter(c => selectedConsultantIds.includes(c.id))
                      .map(consultant => (
                        <option key={consultant.id} value={consultant.id}>
                          {consultant.name} ({consultant.email})
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    The Product Manager must be one of the selected team members
                  </p>
                </div>

                {/* Dates and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date <span className="text-red-500">*</span>
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
                      Duration (weeks) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" 
                      id="durationInWeeks" 
                      value={durationInWeeks} 
                      onChange={(e) => setDurationInWeeks(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min="1"
                      required
                      placeholder="e.g., 12"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Sprints will be auto-generated based on duration
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-8 flex justify-end gap-4">
                <Link 
                  href="/dashboard" 
                  className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit" 
                  disabled={isLoading}
                  className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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