'use client';

import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaClock, FaUsers, FaProjectDiagram, FaChartBar, FaEye } from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';

interface ProjectBudget {
  id: string;
  title: string;
  budgetedHours: number;
  totalAllocated: number;
  totalPlanned: number;
  remaining: number;
  utilizationRate: string;
  teamSize: number;
  phaseCount: number;
}

interface BudgetData {
  projects: ProjectBudget[];
}

export default function BudgetOverview() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        const response = await axios.get('/api/budget');
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load budget data');
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, []);

  const getUtilizationColor = (rate: string) => {
    const numRate = parseFloat(rate);
    if (numRate < 70) return 'text-red-600 bg-red-100';
    if (numRate < 90) return 'text-yellow-600 bg-yellow-100';
    if (numRate <= 100) return 'text-green-600 bg-green-100';
    return 'text-red-600 bg-red-100';
  };

  const getRemainingColor = (remaining: number) => {
    if (remaining < 0) return 'text-red-600';
    if (remaining === 0) return 'text-gray-600';
    return 'text-green-600';
  };

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

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No budget data available</p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalBudget = data.projects.reduce((sum, p) => sum + p.budgetedHours, 0);
  const totalAllocated = data.projects.reduce((sum, p) => sum + p.totalAllocated, 0);
  const totalPlanned = data.projects.reduce((sum, p) => sum + p.totalPlanned, 0);
  const totalRemaining = data.projects.reduce((sum, p) => sum + p.remaining, 0);
  const overallUtilization = totalBudget > 0 ? ((totalAllocated / totalBudget) * 100).toFixed(1) : '0';

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Budget Overview</h1>
        <p className="text-lg text-gray-600">Track resource allocation and budget utilization across all projects</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-foreground">{totalBudget}h</p>
            </div>
            <FaMoneyBillWave className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Allocated</p>
              <p className="text-2xl font-bold text-foreground">{totalAllocated}h</p>
            </div>
            <FaClock className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
              <p className={`text-2xl font-bold ${getUtilizationColor(overallUtilization).split(' ')[0]}`}>
                {overallUtilization}%
              </p>
            </div>
            <FaChartBar className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-foreground">{data.projects.length}</p>
            </div>
            <FaProjectDiagram className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-foreground">Project Budget Breakdown</h2>
        </div>
        
        {data.projects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No projects found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Allocated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Planned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">{project.title}</div>
                        <div className="text-sm text-muted-foreground">{project.phaseCount} phases</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {project.budgetedHours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {project.totalAllocated}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {project.totalPlanned}h
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getRemainingColor(project.remaining)}`}>
                      {project.remaining > 0 ? '+' : ''}{project.remaining}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getUtilizationColor(project.utilizationRate)}`}>
                        {project.utilizationRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-foreground">
                        <FaUsers className="h-4 w-4 mr-1 text-muted-foreground" />
                        {project.teamSize}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/budget/${project.id}`}
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
        )}
      </div>
    </div>
  );
}