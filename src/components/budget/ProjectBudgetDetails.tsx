'use client';

import { useState, useEffect } from 'react';
import { FaArrowLeft, FaUsers, FaClock, FaChartBar, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';

interface ConsultantAllocation {
  consultantId: string;
  consultantName: string;
  allocated: number;
  planned: number;
}

interface PhaseBreakdown {
  phaseId: string;
  phaseName: string;
  allocated: number;
  planned: number;
  consultants: ConsultantAllocation[];
}

interface BudgetSummary {
  totalBudget: number;
  totalAllocated: number;
  totalPlanned: number;
  remaining: number;
  utilizationRate: string;
}

interface ProjectDetails {
  id: string;
  title: string;
  budgetedHours: number;
}

interface ProjectBudgetData {
  project: ProjectDetails;
  summary: BudgetSummary;
  phaseBreakdown: PhaseBreakdown[];
}

interface ProjectBudgetDetailsProps {
  projectId: string;
}

export default function ProjectBudgetDetails({ projectId }: ProjectBudgetDetailsProps) {
  const [data, setData] = useState<ProjectBudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectBudget = async () => {
      try {
        const response = await axios.get(`/api/budget/${projectId}`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load project budget');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectBudget();
  }, [projectId]);

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Link
          href="/dashboard/budget"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <FaArrowLeft /> Back to Budget Overview
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <Link
          href="/dashboard/budget"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <FaArrowLeft /> Back to Budget Overview
        </Link>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No project data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/budget"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
        >
          <FaArrowLeft /> Back to Budget Overview
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">{data.project.title}</h1>
        <p className="text-lg text-gray-600">Detailed budget breakdown and resource allocation</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-foreground">{data.summary.totalBudget}h</p>
            </div>
            <FaClock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Allocated</p>
              <p className="text-2xl font-bold text-foreground">{data.summary.totalAllocated}h</p>
            </div>
            <FaUsers className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
              <p className={`text-2xl font-bold ${getUtilizationColor(data.summary.utilizationRate).split(' ')[0]}`}>
                {data.summary.utilizationRate}%
              </p>
            </div>
            <FaChartBar className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining Budget</p>
              <p className={`text-2xl font-bold ${getRemainingColor(data.summary.remaining)}`}>
                {data.summary.remaining > 0 ? '+' : ''}{data.summary.remaining}h
              </p>
            </div>
            <FaCalendarAlt className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Phase Breakdown */}
      <div className="space-y-6">
        {data.phaseBreakdown.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border p-8 text-center">
            <p className="text-muted-foreground">No phases found for this project</p>
          </div>
        ) : (
          data.phaseBreakdown.map((phase) => (
            <div key={phase.phaseId} className="bg-white rounded-lg shadow-md border">
              <div className="p-6 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-foreground">{phase.phaseName}</h2>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>Allocated: <span className="font-medium">{phase.allocated}h</span></span>
                    <span>Planned: <span className="font-medium">{phase.planned}h</span></span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-medium text-foreground mb-4">Consultant Allocations</h3>
                {phase.consultants.length === 0 ? (
                  <p className="text-muted-foreground">No consultants allocated to this phase</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {phase.consultants.map((consultant) => (
                      <div key={consultant.consultantId} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">{consultant.consultantName}</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Allocated:</span>
                            <span className="font-medium">{consultant.allocated}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Planned:</span>
                            <span className="font-medium">{consultant.planned}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Remaining:</span>
                            <span className={`font-medium ${getRemainingColor(consultant.allocated - consultant.planned)}`}>
                              {consultant.allocated - consultant.planned}h
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}