'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { User } from '@prisma/client';
import DashboardLayout from '@/app/components/DashboardLayout';

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
  
  // New state for handling consultant selection
  const [consultants, setConsultants] = useState<User[]>([]);
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);
  
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
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (selectedConsultantIds.length === 0) {
      setError('You must assign at least one consultant to the project.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/projects', {
        title,
        description,
        startDate,
        durationInWeeks: parseInt(durationInWeeks, 10),
        consultantIds: selectedConsultantIds, // Send the array of consultant IDs
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Create New Project</h1>
            <p className="text-lg text-gray-600 mt-1">
              Define the project details and assign consultants. The sprint schedule will be generated automatically.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="bg-white p-8 shadow-md rounded-lg border border-gray-200">
            <div className="space-y-6">
              {/* Title, Description, Dates, Duration fields remain the same */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Project Title</label>
                <input
                  type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              {/* --- NEW CONSULTANT ASSIGNMENT FIELD --- */}
              <div>
                <label htmlFor="consultants" className="block text-sm font-medium text-gray-700">Assign Consultants</label>
                <select
                  id="consultants"
                  multiple
                  value={selectedConsultantIds}
                  onChange={handleConsultantChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm h-32"
                  required
                >
                  {consultants.map(consultant => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.name} ({consultant.email})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Hold Command (Mac) or Ctrl (Windows) to select multiple consultants.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required
                  />
                </div>
                <div>
                  <label htmlFor="durationInWeeks" className="block text-sm font-medium text-gray-700">Duration (weeks)</label>
                  <input
                    type="number" id="durationInWeeks" value={durationInWeeks} onChange={(e) => setDurationInWeeks(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" min="1" required
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <div className="mt-8 flex justify-end gap-4">
              <Link href="/dashboard" className="py-2 px-4 border rounded-md text-sm font-medium">Cancel</Link>
              <button
                type="submit" disabled={isLoading}
                className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
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