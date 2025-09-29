'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { DatePickerWithRange } from '@/app/components/ui/date-range-picker';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-hot-toast';

interface RevenueData {
  month: string;
  actual: number;
  projected: number;
  target: number;
}

interface ClientProfitability {
  client: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  [key: string]: string | number;
}

interface ResourceUtilization {
  consultant: string;
  utilized: number;
  available: number;
  utilization: number;
  billableRate: number;
}

interface ProjectROI {
  project: string;
  investment: number;
  return: number;
  roi: number;
  status: string;
}

export default function GrowthTeamReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('monthly');

  // Sample data - in a real app, this would come from the database
  const [revenueData] = useState<RevenueData[]>([
    { month: 'Jan 2024', actual: 245000, projected: 250000, target: 280000 },
    { month: 'Feb 2024', actual: 278000, projected: 275000, target: 290000 },
    { month: 'Mar 2024', actual: 312000, projected: 310000, target: 300000 },
    { month: 'Apr 2024', actual: 298000, projected: 305000, target: 320000 },
    { month: 'May 2024', actual: 334000, projected: 330000, target: 340000 },
    { month: 'Jun 2024', actual: 356000, projected: 350000, target: 350000 },
  ]);

  const [clientProfitability] = useState<ClientProfitability[]>([
    { client: 'TechCorp', revenue: 125000, cost: 87500, profit: 37500, margin: 30 },
    { client: 'Innovation Labs', revenue: 98000, cost: 78400, profit: 19600, margin: 20 },
    { client: 'Digital Solutions', revenue: 156000, cost: 109200, profit: 46800, margin: 30 },
    { client: 'StartupX', revenue: 67000, cost: 53600, profit: 13400, margin: 20 },
    { client: 'Enterprise Co', revenue: 234000, cost: 163800, profit: 70200, margin: 30 },
  ]);

  const [resourceUtilization] = useState<ResourceUtilization[]>([
    { consultant: 'John Smith', utilized: 32, available: 40, utilization: 80, billableRate: 150 },
    { consultant: 'Sarah Johnson', utilized: 36, available: 40, utilization: 90, billableRate: 175 },
    { consultant: 'Mike Chen', utilized: 28, available: 40, utilization: 70, billableRate: 140 },
    { consultant: 'Emily Davis', utilized: 38, available: 40, utilization: 95, billableRate: 160 },
    { consultant: 'Alex Rodriguez', utilized: 30, available: 40, utilization: 75, billableRate: 145 },
  ]);

  const [projectROI] = useState<ProjectROI[]>([
    { project: 'Platform Modernization', investment: 85000, return: 127500, roi: 50, status: 'completed' },
    { project: 'Mobile App Development', investment: 120000, return: 168000, roi: 40, status: 'completed' },
    { project: 'Data Analytics Setup', investment: 65000, return: 91000, roi: 40, status: 'completed' },
    { project: 'Cloud Migration', investment: 145000, return: 188500, roi: 30, status: 'in-progress' },
    { project: 'AI Implementation', investment: 200000, return: 240000, roi: 20, status: 'in-progress' },
  ]);

  // Resource Utilization Data
  const [consultantUtilization] = useState([
    { name: 'John Smith', allocated: 36, available: 40, utilization: 90, trend: '+5%', status: 'optimal' },
    { name: 'Sarah Johnson', allocated: 42, available: 40, utilization: 105, trend: '+15%', status: 'overbooked' },
    { name: 'Mike Chen', allocated: 28, available: 40, utilization: 70, trend: '-10%', status: 'underutilized' },
    { name: 'Emily Davis', allocated: 38, available: 40, utilization: 95, trend: '+8%', status: 'optimal' },
    { name: 'Alex Rodriguez', allocated: 24, available: 40, utilization: 60, trend: '-20%', status: 'underutilized' },
  ]);

  const [futureCapacity] = useState([
    { month: 'Jan 2024', available: 200, allocated: 168, capacity: 84 },
    { month: 'Feb 2024', available: 200, allocated: 185, capacity: 92.5 },
    { month: 'Mar 2024', available: 200, allocated: 195, capacity: 97.5 },
    { month: 'Apr 2024', available: 200, allocated: 180, capacity: 90 },
  ]);

  // Project Performance Data
  const [projectProgress] = useState([
    { project: 'Platform Modernization', progress: 85, milestones: { completed: 8, total: 10 }, status: 'on-track' },
    { project: 'Mobile App Development', progress: 60, milestones: { completed: 6, total: 12 }, status: 'delayed' },
    { project: 'Data Analytics Setup', progress: 95, milestones: { completed: 9, total: 10 }, status: 'on-track' },
    { project: 'Cloud Migration', progress: 40, milestones: { completed: 4, total: 15 }, status: 'at-risk' },
  ]);

  const [phaseStatus] = useState([
    { phase: 'Discovery', project: 'Platform Modernization', status: 'completed', budget: 100, spent: 95 },
    { phase: 'Development', project: 'Mobile App', status: 'delayed', budget: 100, spent: 120 },
    { phase: 'Testing', project: 'Data Analytics', status: 'on-track', budget: 100, spent: 85 },
    { phase: 'Deployment', project: 'Cloud Migration', status: 'at-risk', budget: 100, spent: 110 },
  ]);

  const [sprintVelocity] = useState([
    { sprint: 'Sprint 1', planned: 25, completed: 23, velocity: 92 },
    { sprint: 'Sprint 2', planned: 28, completed: 30, velocity: 107 },
    { sprint: 'Sprint 3', planned: 26, completed: 24, velocity: 92 },
    { sprint: 'Sprint 4', planned: 30, completed: 28, velocity: 93 },
  ]);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const exportReport = async (reportType: string) => {
    try {
      // Create a new window with the report content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to export reports');
        return;
      }
      
      const reportContent = `
        <html>
          <head>
            <title>Growth Team Report - ${reportType}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #1f2937; text-align: center; }
              h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .header-info { margin: 20px 0; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h1>Growth Team Report</h1>
            <div class="header-info">
              <p><strong>Report Type:</strong> ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}</p>
              <p><strong>Generated:</strong> ${format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
              <p><strong>Period:</strong> ${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}</p>
            </div>
            
            ${reportType === 'revenue' || reportType === 'comprehensive' ? `
              <h2>Revenue Analysis</h2>
              <table>
                <thead>
                  <tr><th>Month</th><th>Actual</th><th>Projected</th><th>Target</th></tr>
                </thead>
                <tbody>
                  ${revenueData.map(item => `
                    <tr>
                      <td>${item.month}</td>
                      <td>$${item.actual.toLocaleString()}</td>
                      <td>$${item.projected.toLocaleString()}</td>
                      <td>$${item.target.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
            
            ${reportType === 'utilization' || reportType === 'comprehensive' ? `
              <h2>Resource Utilization</h2>
              <table>
                <thead>
                  <tr><th>Consultant</th><th>Allocated</th><th>Available</th><th>Utilization</th><th>Status</th></tr>
                </thead>
                <tbody>
                  ${consultantUtilization.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.allocated}h</td>
                      <td>${item.available}h</td>
                      <td>${item.utilization}%</td>
                      <td>${item.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </body>
        </html>
      `;
      
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.print();
      
      toast.success(`${reportType} report ready for printing/PDF export`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const pieChartColors = ['#0066CC', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 85) return 'text-green-600';
    if (utilization >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getROIColor = (roi: number) => {
    if (roi >= 40) return 'text-green-600';
    if (roi >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => exportReport('comprehensive')} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="profitability">Client Profitability</TabsTrigger>
          <TabsTrigger value="resources">Resource Planning</TabsTrigger>
          <TabsTrigger value="roi">Project ROI</TabsTrigger>
          <TabsTrigger value="utilization">Resource Utilization</TabsTrigger>
          <TabsTrigger value="performance">Project Performance</TabsTrigger>
        </TabsList>

        {/* Revenue Analysis */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$1,823,000</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12.5%</span> from last period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8.7%</div>
                <p className="text-xs text-muted-foreground">
                  Monthly growth rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Target Achievement</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">102%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+2%</span> above target
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Revenue Trend Analysis</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportReport('revenue')}>
                <FileText className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000)}K`} />
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#0066CC" 
                    strokeWidth={3}
                    name="Actual Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projected" 
                    stroke="#10B981" 
                    strokeDasharray="5 5"
                    name="Projected Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#F59E0B" 
                    strokeDasharray="10 5"
                    name="Revenue Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Profitability */}
        <TabsContent value="profitability" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Client Revenue Distribution</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportReport('profitability')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientProfitability}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="revenue"
                      nameKey="client"
                    >
                      {clientProfitability.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Profitability Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientProfitability.map((client, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{client.client}</div>
                        <div className="text-sm text-muted-foreground">
                          Revenue: ${client.revenue.toLocaleString()} | 
                          Profit: ${client.profit.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{client.margin}%</div>
                        <Badge variant={client.margin >= 25 ? "default" : "secondary"}>
                          {client.margin >= 25 ? "High Margin" : "Standard"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resource Planning */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">82%</div>
                <p className="text-xs text-muted-foreground">
                  Average team utilization
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billable Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$295K</div>
                <p className="text-xs text-muted-foreground">
                  This month's billable revenue
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Resource Utilization Analysis</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportReport('resources')}>
                <FileText className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resourceUtilization.map((resource, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{resource.consultant}</div>
                      <div className="text-sm text-muted-foreground">
                        {resource.utilized}h / {resource.available}h utilized | 
                        Rate: ${resource.billableRate}/hr
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getUtilizationColor(resource.utilization)}`}>
                        {resource.utilization}%
                      </div>
                      <Badge variant={resource.utilization >= 85 ? "default" : resource.utilization >= 75 ? "secondary" : "destructive"}>
                        {resource.utilization >= 85 ? "Optimal" : resource.utilization >= 75 ? "Good" : "Low"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilization Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resourceUtilization}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="consultant" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="utilization" fill="#0066CC" name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project ROI */}
        <TabsContent value="roi" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">36%</div>
                <p className="text-xs text-muted-foreground">
                  Across all completed projects
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$615K</div>
                <p className="text-xs text-muted-foreground">
                  Total project investment
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$815K</div>
                <p className="text-xs text-muted-foreground">
                  Total project returns
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Project ROI Analysis</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportReport('roi')}>
                <FileText className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectROI.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{project.project}</div>
                      <div className="text-sm text-muted-foreground">
                        Investment: ${project.investment.toLocaleString()} | 
                        Return: ${project.return.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${getROIColor(project.roi)}`}>
                        {project.roi}%
                      </div>
                      <Badge variant={project.status === 'completed' ? "default" : "secondary"}>
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Utilization Reports */}
        <TabsContent value="utilization" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">84%</div>
                <p className="text-xs text-muted-foreground">Team average utilization</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overbooked</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">1</div>
                <p className="text-xs text-muted-foreground">Consultant over 100%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Underutilized</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">2</div>
                <p className="text-xs text-muted-foreground">Consultants under 75%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Consultant Utilization Report</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportReport('utilization')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {consultantUtilization.map((consultant, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{consultant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {consultant.allocated}h / {consultant.available}h allocated
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          consultant.status === 'overbooked' ? 'text-red-600' :
                          consultant.status === 'underutilized' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {consultant.utilization}%
                        </div>
                        <Badge variant={
                          consultant.status === 'overbooked' ? "destructive" :
                          consultant.status === 'underutilized' ? "secondary" : "default"
                        }>
                          {consultant.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Future Capacity Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={futureCapacity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="available" fill="#e5e7eb" name="Available Hours" />
                    <Bar dataKey="allocated" fill="#3b82f6" name="Allocated Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Project Performance Reports */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Track</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">2</div>
                <p className="text-xs text-muted-foreground">Projects on schedule</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">1</div>
                <p className="text-xs text-muted-foreground">Projects need attention</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delayed</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">1</div>
                <p className="text-xs text-muted-foreground">Projects behind schedule</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Project Progress Report</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportReport('performance')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectProgress.map((project, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{project.project}</div>
                        <Badge variant={
                          project.status === 'on-track' ? "default" :
                          project.status === 'delayed' ? "destructive" : "secondary"
                        }>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Progress: {project.progress}%</span>
                        <span>Milestones: {project.milestones.completed}/{project.milestones.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            project.status === 'on-track' ? 'bg-green-500' :
                            project.status === 'delayed' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phase Status Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {phaseStatus.map((phase, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{phase.phase}</div>
                        <div className="text-sm text-muted-foreground">{phase.project}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          phase.spent > phase.budget ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ${phase.spent}% of budget
                        </div>
                        <Badge variant={
                          phase.status === 'completed' ? "default" :
                          phase.status === 'on-track' ? "secondary" : "destructive"
                        }>
                          {phase.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sprint Velocity Report</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sprintVelocity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sprint" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="planned" fill="#e5e7eb" name="Planned Points" />
                  <Bar dataKey="completed" fill="#10b981" name="Completed Points" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}