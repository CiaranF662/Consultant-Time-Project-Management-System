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

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const exportReport = async (reportType: string) => {
    try {
      // In a real implementation, this would generate and download a PDF/CSV report
      const reportData = {
        type: reportType,
        dateRange: {
          from: format(dateRange.from, 'yyyy-MM-dd'),
          to: format(dateRange.to, 'yyyy-MM-dd')
        },
        generatedBy: user?.name,
        generatedAt: new Date().toISOString(),
        data: {
          revenue: revenueData,
          clientProfitability,
          resourceUtilization,
          projectROI
        }
      };

      // Create a downloadable file
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `growth-team-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success(`${reportType} report exported successfully`);
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Growth Team Reports</h2>
          <p className="text-muted-foreground">Strategic insights for revenue optimization and resource planning</p>
        </div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="profitability">Client Profitability</TabsTrigger>
          <TabsTrigger value="resources">Resource Planning</TabsTrigger>
          <TabsTrigger value="roi">Project ROI</TabsTrigger>
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
      </Tabs>
    </div>
  );
}