/*Shows summary cards (total budget, allocated hours, utilization, active projects).
Renders a table of projects with breakdown info:
Title & phases
Budget, allocated, planned, remaining hours
Utilization badge (with color based on percentage)
Team size
Action link → "View Details"
interactive client UI (fetch & display data)
*/
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { 
  FaMoneyBillWave, 
  FaClock, 
  FaUsers, 
  FaProjectDiagram, 
  FaChartBar, 
  FaEye 
} from 'react-icons/fa'

// #region Types
interface ProjectBudget {
  id: string;
  title: string;
  budgetedHours: number;
  totalAllocated: number;
  totalPlanned: number;
  remaining: number;
  utilizationRate: string; // kept as string since API returns formatted %
  teamSize: number;
  phaseCount: number;
}

interface BudgetData {
  projects: ProjectBudget[];
}
// #endregion Types

// #region Helpers
/**
 * Returns a Tailwind CSS color class for utilization rate.
 */
const getUtilizationColor = (rate: string) => {
  const numRate = parseFloat(rate);
  if (numRate < 70) return 'text-red-600 bg-red-100';
  if (numRate < 90) return 'text-yellow-600 bg-yellow-100';
  if (numRate <= 100) return 'text-green-600 bg-green-100';
  return 'text-red-600 bg-red-100';
};

/**
 * Returns a Tailwind CSS text color for remaining hours.
 */
const getRemainingColor = (remaining: number) => {
  if (remaining < 0) return 'text-red-600';
  if (remaining === 0) return 'text-gray-600';
  return 'text-green-600';
};
// #endregion Helpers

// #region Component
/**
 * Displays budget overview dashboard:
 * - Fetches budget data from API
 * - Shows loading, error, or empty states
 * - Renders summary cards and project table
 */
export default function BudgetOverview() {
  // #region State
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // #endregion State

  // #region Effects
  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        const response = await axios.get<BudgetData>('/api/budget');
        setData(response.data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || 'Failed to load budget data');
        } else {
          setError('Unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, []);
  // #endregion Effects

  // #region Derived Values
  const totalBudget = data?.projects.reduce((sum, p) => sum + p.budgetedHours, 0) ?? 0;
  const totalAllocated = data?.projects.reduce((sum, p) => sum + p.totalAllocated, 0) ?? 0;
  const totalPlanned = data?.projects.reduce((sum, p) => sum + p.totalPlanned, 0) ?? 0;
  const totalRemaining = data?.projects.reduce((sum, p) => sum + p.remaining, 0) ?? 0;
  const overallUtilization = totalBudget > 0 
    ? ((totalAllocated / totalBudget) * 100).toFixed(1) 
    : '0';
  // #endregion Derived Values

  // #region Conditional Rendering
  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.projects.length === 0) {
    return (
      <div className="p-8 text-center py-8">
        <p className="text-gray-500">No budget data available</p>
      </div>
    );
  }
  // #endregion Conditional Rendering

  // #region Render
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Budget Overview</h1>
        <p className="text-lg text-gray-600">
          Track resource allocation and budget utilization across all projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Budget */}
        <SummaryCard 
          label="Total Budget" 
          value={`${totalBudget}h`} 
          icon={<FaMoneyBillWave className="h-8 w-8 text-blue-500" />} 
        />
        {/* Total Allocated */}
        <SummaryCard 
          label="Total Allocated" 
          value={`${totalAllocated}h`} 
          icon={<FaClock className="h-8 w-8 text-green-500" />} 
        />
        {/* Utilization */}
        <SummaryCard 
          label="Utilization Rate" 
          value={`${overallUtilization}%`} 
          valueClass={getUtilizationColor(overallUtilization).split(' ')[0]} 
          icon={<FaChartBar className="h-8 w-8 text-purple-500" />} 
        />
        {/* Projects */}
        <SummaryCard 
          label="Active Projects" 
          value={data.projects.length.toString()} 
          icon={<FaProjectDiagram className="h-8 w-8 text-orange-500" />} 
        />
      </div>

      {/* Projects Table */}
      <ProjectsTable projects={data.projects} />
    </div>
  );
  // #endregion Render
}
// #endregion Component

// #region Subcomponents
interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon, valueClass }) => (
  <div className="bg-white p-6 rounded-lg shadow-md border">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className={`text-2xl font-bold text-gray-900 ${valueClass ?? ''}`}>{value}</p>
      </div>
      {icon}
    </div>
  </div>
);

interface ProjectsTableProps {
  projects: ProjectBudget[];
}

const ProjectsTable: React.FC<ProjectsTableProps> = ({ projects }) => (
  <div className="bg-white rounded-lg shadow-md border overflow-hidden">
    <div className="p-4 border-b bg-gray-50">
      <h2 className="text-xl font-semibold text-gray-800">Project Budget Breakdown</h2>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {['Project','Budget','Allocated','Planned','Remaining','Utilization','Team','Actions']
              .map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">{project.title}</div>
                  <div className="text-sm text-gray-500">{project.phaseCount} phases</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.budgetedHours}h</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.totalAllocated}h</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.totalPlanned}h</td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getRemainingColor(project.remaining)}`}>
                {project.remaining > 0 ? '+' : ''}{project.remaining}h
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getUtilizationColor(project.utilizationRate)}`}>
                  {project.utilizationRate}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                  <FaUsers className="h-4 w-4 mr-1 text-gray-400" />
                  {project.teamSize}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Link
                  href={`/budget/${project.id}`}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900"
                >
                  <FaEye className="h-4 w-4" />
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
// #endregion Subcomponents
