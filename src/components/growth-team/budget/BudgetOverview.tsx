"use client";

import { useState, useEffect } from "react";
import { useTheme } from '@/contexts/ThemeContext';
import PageLoader from '@/components/ui/PageLoader';
import axios from "axios";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { FaUsers, FaEye } from "react-icons/fa";
import {
  TrendingUp, DollarSign, Activity, Download,
  AlertTriangle, CheckCircle, Clock
} from "lucide-react";

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
  const { theme } = useTheme();

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        const response = await axios.get("/api/budget");
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load budget data");
      } finally {
        setLoading(false);
      }
    };
    fetchBudgetData();
  }, []);

  if (loading) return <PageLoader message="Loading Budget Overview…" />;
  if (error) return <div className={`p-8 text-red-600 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>Error: {error}</div>;
  if (!data) return <div className={`p-8 ${theme === 'dark' ? 'text-muted-foreground bg-gray-900' : 'text-muted-foreground bg-white'}`}>No budget data available</div>;

  // 📊 Summary stats
  const totalBudget = data.projects.reduce((sum, p) => sum + p.budgetedHours, 0);
  const totalAllocated = data.projects.reduce((sum, p) => sum + p.totalAllocated, 0);
  const overallUtilization = totalBudget > 0 ? ((totalAllocated / totalBudget) * 100).toFixed(1) : "0";
  const activeProjects = data.projects.length;

  // Chart data
  const budgetComparisonData = data.projects.map((p) => ({
    name: p.title,
    budget: p.budgetedHours,
    allocated: p.totalAllocated,
    over: Math.max(0, p.totalAllocated - p.budgetedHours),
  }));

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#eab308"];

  const utilizationChartData = data.projects.map((p, i) => ({
    name: p.title,
    value: p.totalAllocated,
    utilization: parseFloat(p.utilizationRate),
    color: COLORS[i % COLORS.length],
  }));

  const monthlyTrendData = [
    { month: "Aug", totalBudget: totalBudget * 0.8, totalAllocated: totalAllocated * 0.6 },
    { month: "Sep", totalBudget: totalBudget * 0.9, totalAllocated: totalAllocated * 0.75 },
    { month: "Oct", totalBudget: totalBudget, totalAllocated: totalAllocated },
  ];

  // Helpers
  const getStatusIcon = (utilization: number) => {
    if (utilization > 100) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (utilization >= 80) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Clock className="w-5 h-5 text-blue-500" />;
  };

  const CustomTooltip = ({ active, payload, label }: any) =>
    active && payload?.length ? (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.value}h
          </p>
        ))}
      </div>
    ) : null;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 min-h-screen">
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Budget Overview
            </h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Track resource allocation and budget utilization across all projects
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors duration-200">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Summary Cards - Enhanced to match system theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalBudget}h</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Budget</p>
              </div>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800/50 rounded-full h-1.5">
              <div className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full w-full"></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500 dark:bg-green-600 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalAllocated}h</p>
                <p className="text-sm text-green-600 dark:text-green-400">Total Allocated</p>
              </div>
            </div>
            <div className="w-full bg-green-200 dark:bg-green-800/50 rounded-full h-1.5">
              <div
                className="bg-green-500 dark:bg-green-400 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min((totalAllocated / Math.max(totalBudget, 1)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500 dark:bg-purple-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  parseFloat(overallUtilization) < 70 ? 'text-red-700 dark:text-red-300' :
                  parseFloat(overallUtilization) < 90 ? 'text-yellow-700 dark:text-yellow-300' :
                  parseFloat(overallUtilization) <= 100 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  {overallUtilization}%
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Utilization Rate</p>
              </div>
            </div>
            <div className="w-full bg-purple-200 dark:bg-purple-800/50 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  parseFloat(overallUtilization) < 70 ? 'bg-red-500 dark:bg-red-400' :
                  parseFloat(overallUtilization) < 90 ? 'bg-yellow-500 dark:bg-yellow-400' :
                  parseFloat(overallUtilization) <= 100 ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'
                }`}
                style={{ width: `${Math.min(parseFloat(overallUtilization), 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500 dark:bg-orange-600 rounded-lg">
                <FaUsers className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{activeProjects}</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Active Projects</p>
              </div>
            </div>
            <div className="text-xs text-orange-700 dark:text-orange-300">
              Tracking {activeProjects} {activeProjects === 1 ? 'project' : 'projects'}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Budget vs Allocated */}
          <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm border border-gray-200 p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>Budget vs Allocated</h3>
              {/* Legend */}
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-blue-500 rounded-sm"></span> Budget
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-green-500 rounded-sm"></span> Allocated
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-4 bg-red-500 rounded-sm"></span> Over Budget
                </span>
              </div>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={budgetComparisonData}
                  margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    interval={0}
                    tick={({ x, y, payload }) => {
                      const words = payload.value.split(" ");
                      return (
                        <text x={x} y={y + 15} textAnchor="middle" fill="#374151" fontSize="10">
                          {words.map((word: string, i: number) => (
                            <tspan key={i} x={x} dy={i === 0 ? 0 : 12}>
                              {word}
                            </tspan>
                          ))}
                        </text>
                      );
                    }}
                    height={40}
                  />
                  <YAxis
                    label={{
                      value: 'HOURS',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontWeight: 'bold', fill: '#111827', fontSize: '12px', letterSpacing: '0.05em' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                  <Bar dataKey="allocated" fill="#10b981" name="Allocated" />
                  <Bar dataKey="over" fill="#ef4444" name="Over Budget" />
                </BarChart>
              </ResponsiveContainer>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">PROJECTS</span>
              </div>
            </div>
          </div>

          {/* Pie Chart */}
          <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm border border-gray-200 p-6`}>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>Allocation Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={utilizationChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                  {utilizationChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {utilizationChartData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} truncate`}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm border border-gray-200 p-6`}>
          <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>Budget Trends Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrendData}>
              <defs>
                <linearGradient id="budget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="allocated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="totalBudget" stroke="#3b82f6" fill="url(#budget)" />
              <Area type="monotone" dataKey="totalAllocated" stroke="#10b981" fill="url(#allocated)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Project Table */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-xl shadow-sm border border-gray-200 overflow-hidden`}>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
            <h3 className="text-xl font-bold text-white">Project Budget Breakdown</h3>
            <p className="text-blue-100 text-sm mt-1">Detailed allocation and utilization per project</p>
          </div>
          <table className="w-full">
            <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} border-b-2 border-gray-200`}>
              <tr>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Project</th>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Budget</th>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Allocated</th>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Planned</th>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Remaining</th>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Utilization</th>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Team</th>
                <th className={`py-4 px-6 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-card-foreground'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'} divide-y`}>
              {data.projects.map((p) => (
                <tr key={p.id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} transition-colors duration-150`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(parseFloat(p.utilizationRate))}
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-foreground'}`}>{p.title}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-foreground'}`}>{p.budgetedHours}h</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-foreground'}`}>{p.totalAllocated}h</span>
                    <div className="w-20 bg-gray-200 rounded-full h-1 mt-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full"
                        style={{ width: `${Math.min((p.totalAllocated / Math.max(p.budgetedHours, 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className={`py-4 px-6 ${theme === 'dark' ? 'text-gray-300' : 'text-foreground'}`}>{p.totalPlanned}h</td>
                  <td className={`py-4 px-6 font-bold ${p.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {p.remaining > 0 ? "+" : ""}{p.remaining}h
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      parseFloat(p.utilizationRate) < 70 ? 'text-red-600 bg-red-100' :
                      parseFloat(p.utilizationRate) < 90 ? 'text-yellow-600 bg-yellow-100' :
                      parseFloat(p.utilizationRate) <= 100 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                    }`}>
                      {p.utilizationRate}%
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1 font-medium">
                      <div className="p-1.5 bg-gray-100 rounded">
                        <FaUsers className="h-3 w-3 text-gray-600" />
                      </div>
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-foreground'}`}>{p.teamSize}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Link href={`/dashboard/budget/${p.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150">
                      <FaEye className="h-3.5 w-3.5" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}