import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Progress } from '@/app/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart 
} from 'recharts';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Target,
  Calendar,
  Activity
} from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { format, subDays, addDays } from 'date-fns';

interface ProjectHealth {
  project: string;
  client: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'delayed';
  budget: number;
  spent: number;
  team: number;
  deadline: string;
}

interface TeamPerformance {
  consultant: string;
  efficiency: number;
  hoursLogged: number;
  tasksCompleted: number;
  utilization: number;
  projects: number;
}

interface ResourceConflict {
  consultant: string;
  conflictDate: string;
  projects: string[];
  severity: 'low' | 'medium' | 'high';
  resolution: string;
}

interface MilestoneTracking {
  milestone: string;
  project: string;
  dueDate: string;
  status: 'completed' | 'in-progress' | 'overdue';
  progress: number;
  assignee: string;
}

export default function ProjectManagerReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('all');

  // Sample data - in a real app, this would come from the database
  const [projectHealth] = useState<ProjectHealth[]>([
    {
      project: 'Platform Modernization',
      client: 'TechCorp',
      progress: 75,
      status: 'on-track',
      budget: 85000,
      spent: 63750,
      team: 4,
      deadline: '2024-12-15'
    },
    {
      project: 'Mobile App Development',
      client: 'StartupX',
      progress: 45,
      status: 'at-risk',
      budget: 120000,
      spent: 72000,
      team: 5,
      deadline: '2024-11-30'
    },
    {
      project: 'Data Analytics Setup',
      client: 'Innovation Labs',
      progress: 90,
      status: 'on-track',
      budget: 65000,
      spent: 58500,
      team: 3,
      deadline: '2024-10-20'
    },
    {
      project: 'Cloud Migration',
      client: 'Enterprise Co',
      progress: 30,
      status: 'delayed',
      budget: 145000,
      spent: 87000,
      team: 6,
      deadline: '2024-12-31'
    }
  ]);

  const [teamPerformance] = useState<TeamPerformance[]>([
    {
      consultant: 'John Smith',
      efficiency: 92,
      hoursLogged: 156,
      tasksCompleted: 24,
      utilization: 85,
      projects: 2
    },
    {
      consultant: 'Sarah Johnson',
      efficiency: 88,
      hoursLogged: 168,
      tasksCompleted: 31,
      utilization: 90,
      projects: 3
    },
    {
      consultant: 'Mike Chen',
      efficiency: 95,
      hoursLogged: 142,
      tasksCompleted: 28,
      utilization: 78,
      projects: 2
    },
    {
      consultant: 'Emily Davis',
      efficiency: 90,
      hoursLogged: 174,
      tasksCompleted: 35,
      utilization: 95,
      projects: 4
    }
  ]);

  const [resourceConflicts] = useState<ResourceConflict[]>([
    {
      consultant: 'Sarah Johnson',
      conflictDate: '2024-10-15',
      projects: ['Platform Modernization', 'Mobile App Development'],
      severity: 'high',
      resolution: 'Reassign Mobile App tasks to John Smith'
    },
    {
      consultant: 'Mike Chen',
      conflictDate: '2024-10-22',
      projects: ['Data Analytics Setup', 'Cloud Migration'],
      severity: 'medium',
      resolution: 'Extend Data Analytics deadline by 3 days'
    }
  ]);

  const [milestoneTracking] = useState<MilestoneTracking[]>([
    {
      milestone: 'Phase 1 Completion',
      project: 'Platform Modernization',
      dueDate: '2024-10-18',
      status: 'completed',
      progress: 100,
      assignee: 'John Smith'
    },
    {
      milestone: 'UI/UX Design Review',
      project: 'Mobile App Development',
      dueDate: '2024-10-20',
      status: 'in-progress',
      progress: 75,
      assignee: 'Sarah Johnson'
    },
    {
      milestone: 'Data Migration',
      project: 'Cloud Migration',
      dueDate: '2024-10-12',
      status: 'overdue',
      progress: 60,
      assignee: 'Emily Davis'
    },
    {
      milestone: 'Analytics Dashboard',
      project: 'Data Analytics Setup',
      dueDate: '2024-10-25',
      status: 'in-progress',
      progress: 40,
      assignee: 'Mike Chen'
    }
  ]);

  // Weekly progress data for trend analysis
  const [weeklyProgress] = useState([
    { week: 'Week 1', completed: 12, planned: 15, efficiency: 80 },
    { week: 'Week 2', completed: 18, planned: 20, efficiency: 90 },
    { week: 'Week 3', completed: 22, planned: 25, efficiency: 88 },
    { week: 'Week 4', completed: 16, planned: 18, efficiency: 89 },
  ]);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-green-600';
      case 'completed': return 'text-green-600';
      case 'at-risk': return 'text-yellow-600';
      case 'in-progress': return 'text-blue-600';
      case 'delayed': return 'text-red-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'on-track': return 'default';
      case 'completed': return 'default';
      case 'at-risk': return 'secondary';
      case 'in-progress': return 'secondary';
      case 'delayed': return 'destructive';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const exportProjectReport = () => {
    const reportData = {
      generatedBy: user?.name,
      generatedAt: new Date().toISOString(),
      projectHealth,
      teamPerformance,
      resourceConflicts,
      milestoneTracking,
      weeklyProgress
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `project-manager-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Manager Reports</h2>
          <p className="text-muted-foreground">Track project health, team performance, and resource allocation</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectHealth.map(project => (
                <SelectItem key={project.project} value={project.project}>
                  {project.project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportProjectReport} className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">Project Health</TabsTrigger>
          <TabsTrigger value="performance">Team Performance</TabsTrigger>
          <TabsTrigger value="conflicts">Resource Conflicts</TabsTrigger>
          <TabsTrigger value="milestones">Milestone Tracking</TabsTrigger>
        </TabsList>

        {/* Project Health */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectHealth.length}</div>
                <p className="text-xs text-muted-foreground">
                  Projects in progress
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Track</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {projectHealth.filter(p => p.status === 'on-track').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Projects on schedule
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {projectHealth.filter(p => p.status === 'at-risk').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Projects need attention
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delayed</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {projectHealth.filter(p => p.status === 'delayed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Projects behind schedule
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {projectHealth.map((project, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{project.project}</h4>
                        <p className="text-sm text-muted-foreground">{project.client}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(project.status)}>
                          {project.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Due: {format(new Date(project.deadline), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Progress</span>
                          <span className="text-sm font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Budget</span>
                          <span className="text-sm font-medium">
                            {Math.round((project.spent / project.budget) * 100)}%
                          </span>
                        </div>
                        <Progress value={(project.spent / project.budget) * 100} />
                        <div className="text-xs text-muted-foreground mt-1">
                          ${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{project.team}</div>
                          <div className="text-sm text-muted-foreground">Team Members</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#0066CC" 
                    fill="#0066CC" 
                    fillOpacity={0.3}
                    name="Completed Tasks"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="planned" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3}
                    name="Planned Tasks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformance.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{member.consultant}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.hoursLogged}h logged | {member.tasksCompleted} tasks | {member.projects} projects
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{member.efficiency}%</div>
                        <Badge variant={member.efficiency >= 90 ? "default" : "secondary"}>
                          Efficiency
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="consultant" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="utilization" fill="#0066CC" name="Utilization %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="consultant" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#0066CC" 
                    strokeWidth={2}
                    name="Efficiency %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="utilization" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Utilization %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Conflicts */}
        <TabsContent value="conflicts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Resource Conflicts & Resolutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resourceConflicts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Conflicts</h3>
                  <p className="text-muted-foreground">All resource allocations are optimized</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resourceConflicts.map((conflict, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold flex items-center gap-2">
                            {conflict.consultant}
                            <Badge variant={conflict.severity === 'high' ? 'destructive' : conflict.severity === 'medium' ? 'secondary' : 'default'}>
                              {conflict.severity} priority
                            </Badge>
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Conflict Date: {format(new Date(conflict.conflictDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Conflicting Projects:</p>
                        <div className="flex gap-2">
                          {conflict.projects.map((project, pIndex) => (
                            <Badge key={pIndex} variant="outline">{project}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Proposed Resolution:</p>
                        <p className="text-sm text-muted-foreground mt-1">{conflict.resolution}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Milestone Tracking */}
        <TabsContent value="milestones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Milestone Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestoneTracking.map((milestone, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{milestone.milestone}</h4>
                        <p className="text-sm text-muted-foreground">{milestone.project}</p>
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {milestone.assignee}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(milestone.status)}>
                          {milestone.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Due: {format(new Date(milestone.dueDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm font-medium">{milestone.progress}%</span>
                      </div>
                      <Progress value={milestone.progress} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}