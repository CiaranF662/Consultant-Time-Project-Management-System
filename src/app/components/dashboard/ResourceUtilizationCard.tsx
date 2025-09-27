'use client';

import { Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell 
} from 'recharts';

interface ResourceUtilizationData {
  totalCapacity: number;
  totalAllocated: number;
  utilizationRate: number;
  consultants: {
    id: string;
    name: string;
    allocated: number;
    capacity: number;
    utilization: number;
    status: 'under' | 'optimal' | 'over';
  }[];
  byProject?: {
    projectId: string;
    projectName: string;
    allocated: number;
    percentage: number;
  }[];
}

interface ResourceUtilizationCardProps {
  data?: ResourceUtilizationData;
  showTeamBreakdown?: boolean;
  showPersonalView?: boolean;
  userId?: string;
}

/**
 * ResourceUtilizationCard - Shows resource allocation and utilization metrics
 * 
 * Features:
 * - Team overview with utilization rates
 * - Individual consultant breakdown
 * - Visual indicators for over/under allocation
 * - Personal view for consultants
 */
export default function ResourceUtilizationCard({ 
  data, 
  showTeamBreakdown = false,
  showPersonalView = false,
  userId 
}: ResourceUtilizationCardProps) {
  if (!data) return <ResourceUtilizationSkeleton />;

  // Personal view for consultants
  if (showPersonalView && userId) {
    const personalData = data.consultants.find(c => c.id === userId);
    if (personalData) {
      return <PersonalUtilizationView consultant={personalData} />;
    }
  }

  const getUtilizationColor = (rate: number) => {
    if (rate < 70) return 'text-yellow-600';
    if (rate > 100) return 'text-red-600';
    return 'text-green-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'over':
        return <Badge variant="destructive">Overallocated</Badge>;
      case 'under':
        return <Badge variant="secondary">Available</Badge>;
      default:
        return <Badge variant="default">Optimal</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Users className="mr-2 h-4 w-4" />
          Resource Utilization
        </CardTitle>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getUtilizationColor(data.utilizationRate)}`}>
            {data.utilizationRate}%
          </div>
          <div className="text-xs text-gray-500">
            {data.totalAllocated}h / {data.totalCapacity}h
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Utilization</span>
            <span>{data.utilizationRate}%</span>
          </div>
          <Progress 
            value={Math.min(data.utilizationRate, 100)} 
            className={`h-3 ${data.utilizationRate > 100 ? 'bg-red-100' : ''}`}
          />
          {data.utilizationRate > 100 && (
            <div className="flex items-center mt-1 text-xs text-red-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Team is overallocated by {data.utilizationRate - 100}%
          </div>
        )}
        </div>

        {/* Team Breakdown Chart */}
        {showTeamBreakdown && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Team Breakdown</h4>
            
            {/* Bar Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.consultants.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, 'Utilization']}
                    labelFormatter={(label) => `Consultant: ${label}`}
                  />
                  <Bar 
                    dataKey="utilization" 
                    fill="#3B82F6"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Individual Consultant List */}
            <div className="space-y-2">
              {data.consultants.slice(0, 5).map((consultant) => (
                <div key={consultant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {consultant.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{consultant.name}</div>
                      <div className="text-xs text-gray-500">
                        {consultant.allocated}h / {consultant.capacity}h
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getUtilizationColor(consultant.utilization)}`}>
                      {consultant.utilization}%
                    </span>
                    {getStatusBadge(consultant.status)}
                  </div>
                </div>
              ))}
              
              {data.consultants.length > 5 && (
                <div className="text-center py-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    View all {data.consultants.length} consultants
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Distribution (if available) */}
        {data.byProject && data.byProject.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Resource Distribution by Project</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byProject}
                    dataKey="percentage"
                    nameKey="projectName"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    fill="#8884d8"
                  >
                    {data.byProject.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Personal Utilization View - For consultant's personal dashboard
 */
function PersonalUtilizationView({ consultant }: { consultant: any }) {
  const getUtilizationColor = (rate: number) => {
    if (rate < 70) return 'text-yellow-600';
    if (rate > 100) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <TrendingUp className="mr-2 h-4 w-4" />
          My Utilization
        </CardTitle>
        <div className={`text-2xl font-bold ${getUtilizationColor(consultant.utilization)}`}>
          {consultant.utilization}%
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Current Allocation</span>
            <span>{consultant.allocated}h / {consultant.capacity}h</span>
          </div>
          <Progress value={Math.min(consultant.utilization, 100)} className="h-3" />
        </div>

        {/* Status and recommendations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <Badge variant={consultant.status === 'over' ? 'destructive' : 
                            consultant.status === 'under' ? 'secondary' : 'default'}>
              {consultant.status === 'over' ? 'Overallocated' :
               consultant.status === 'under' ? 'Available' : 'Optimal'}
            </Badge>
          </div>

          {consultant.status === 'over' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-red-800">Overallocated</div>
                  <div className="text-xs text-red-600 mt-1">
                    You're allocated {consultant.allocated - consultant.capacity}h over capacity.
                    Consider discussing workload with your PM.
                  </div>
                </div>
              </div>
            </div>
          )}

          {consultant.status === 'under' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-blue-800">Available Capacity</div>
                  <div className="text-xs text-blue-600 mt-1">
                    You have {consultant.capacity - consultant.allocated}h available capacity.
                    Great time to take on new projects!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton
 */
function ResourceUtilizationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Chart colors for pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];