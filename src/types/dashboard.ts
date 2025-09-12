import { UserRole } from '@prisma/client';

/**
 * Core Dashboard Data Structure
 * Aggregates all information needed for role-based dashboard rendering
 */

export interface DashboardData {
  // Current user context
  userId: string;
  userRole: UserRole;
  userName: string;

  // Active project context
  activeProject?: {
    id: string;
    title: string;
    status: 'active' | 'planning' | 'on_hold' | 'completed' | 'at_risk';
    currentPhase: string;
    teamSize: number;
    budgetHealth?: {
      utilizationRate: number;
      remaining: number;
      status: 'healthy' | 'warning' | 'critical';
    };
  };

  // Sprint information
  currentSprint?: {
    id: string;
    number: number;
    startDate: Date;
    endDate: Date;
    progress: number;
  };

  // Upcoming milestone
  upcomingMilestone?: {
    id: string;
    title: string;
    dueDate: Date;
    project: string;
    critical: boolean;
  };

  // Portfolio statistics (Growth Team)
  portfolioStats?: {
    totalProjects: number;
    activeProjects: number;
    utilizationRate: number;
    activeConsultants: number;
    budgetHealth: string;
    totalRevenue: number;
  };

  // Resource utilization data
  resourceUtilization?: {
    totalCapacity: number;
    totalAllocated: number;
    utilizationRate: number;
    consultants: ConsultantUtilization[];
    byProject?: ProjectAllocation[];
  };

  // Budget tracking information
  budgetTracking?: {
    totalBudget: number;
    totalSpent: number;
    totalAllocated: number;
    burnRate: number;
    projectedSpend: number;
    variance: number;
    timeline: BudgetTimelinePoint[];
    projects?: ProjectBudget[];
  };

  // Personal allocations (Consultants)
  myAllocations?: PersonalAllocation[];

  // Team performance metrics
  teamPerformance?: {
    velocity: number;
    efficiency: number;
    satisfaction: number;
    trends: PerformanceTrend[];
    topPerformers: TopPerformer[];
  };

  // Notifications and approvals
  notifications?: Notification[];
  pendingApprovals?: PendingApproval[];
  alerts?: Alert[];
  conflicts?: ResourceConflict[];

  // Quick actions and deadlines
  pendingActions?: PendingAction[];
  upcomingDeadlines?: Deadline[];

  // Team availability (Growth Team)
  teamAvailability?: TeamMember[];
  workloadBalance?: WorkloadData;
  roiMetrics?: ROIData;

  // System alerts
  systemAlerts?: SystemAlert[];
  
  // Quick statistics
  quickStats?: {
    activeProjects: number;
    teamSize: number;
    utilizationRate: number;
    completedTasks: number;
  };

  // Risks and dependencies
  risks?: Risk[];
  dependencies?: Dependency[];

  // Advanced metrics (future)
  advancedMetrics?: AdvancedMetrics;
}

/**
 * Supporting Type Definitions
 */

export interface ConsultantUtilization {
  id: string;
  name: string;
  email: string;
  allocated: number;
  capacity: number;
  utilization: number;
  status: 'under' | 'optimal' | 'over';
  skills?: string[];
  availability?: AvailabilitySlot[];
}

export interface ProjectAllocation {
  projectId: string;
  projectName: string;
  allocated: number;
  percentage: number;
  color?: string;
}

export interface BudgetTimelinePoint {
  week: string;
  budgeted: number;
  actual: number;
  projected: number;
}

export interface ProjectBudget {
  id: string;
  name: string;
  budget: number;
  spent: number;
  allocated: number;
  status: 'on_track' | 'at_risk' | 'over_budget';
  burnRate?: number;
}

export interface PersonalAllocation {
  id: string;
  projectName: string;
  phaseName: string;
  allocatedHours: number;
  weeklyBreakdown: WeeklyHours[];
  status: 'upcoming' | 'active' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface WeeklyHours {
  week: string;
  hours: number;
  confirmed: boolean;
}

export interface PerformanceTrend {
  metric: string;
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TopPerformer {
  id: string;
  name: string;
  metric: string;
  value: number;
  improvement: number;
}

export interface Notification {
  id: string;
  type: 'approval' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  actionable?: boolean;
  actionUrl?: string;
  read?: boolean;
}

export interface PendingApproval {
  id: string;
  type: 'hour_change' | 'project_assignment' | 'budget_adjustment';
  requestor: string;
  requestorId: string;
  project: string;
  projectId: string;
  details: string;
  timestamp: Date;
  urgent?: boolean;
  originalHours?: number;
  requestedHours?: number;
}

export interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedProject?: string;
  affectedConsultant?: string;
  timestamp: Date;
  resolved?: boolean;
  actionRequired?: boolean;
}

export interface ResourceConflict {
  id: string;
  type: 'overallocation' | 'scheduling' | 'skill_mismatch';
  consultantId: string;
  consultantName: string;
  projects: string[];
  severity: 'low' | 'medium' | 'high';
  suggestedResolution?: string;
}

export interface PendingAction {
  id: string;
  type: 'review' | 'approve' | 'update' | 'escalate';
  title: string;
  description: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

export interface Deadline {
  id: string;
  title: string;
  project: string;
  dueDate: Date;
  status: 'on_track' | 'at_risk' | 'overdue';
  assignee?: string;
  type: 'milestone' | 'deliverable' | 'review';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  currentUtilization: number;
  availableHours: number;
  skills: string[];
  currentProjects: string[];
  nextAvailable?: Date;
}

export interface AvailabilitySlot {
  startDate: Date;
  endDate: Date;
  availableHours: number;
  committed: boolean;
}

export interface WorkloadData {
  averageUtilization: number;
  overallocatedCount: number;
  underutilizedCount: number;
  recommendations: WorkloadRecommendation[];
}

export interface WorkloadRecommendation {
  type: 'redistribute' | 'hire' | 'reduce_scope';
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ROIData {
  totalInvestment: number;
  projectedReturn: number;
  currentROI: number;
  timeToBreakeven: number;
  riskAdjustedROI: number;
  byProject: ProjectROI[];
}

export interface ProjectROI {
  projectId: string;
  projectName: string;
  investment: number;
  return: number;
  roi: number;
  confidence: number;
}

export interface SystemAlert {
  message: string;
  type: 'info' | 'warning' | 'error';
  timestamp: Date;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  status: 'identified' | 'mitigating' | 'resolved';
  owner?: string;
  mitigation?: string;
  project?: string;
}

export interface Dependency {
  id: string;
  title: string;
  type: 'blocking' | 'blocked_by';
  sourceProject: string;
  targetProject: string;
  status: 'pending' | 'in_progress' | 'resolved';
  dueDate?: Date;
}

export interface AdvancedMetrics {
  predictiveAnalytics?: {
    capacityForecast: ForecastPoint[];
    demandPrediction: ForecastPoint[];
    riskPrediction: RiskForecast[];
  };
  benchmarking?: {
    industryComparison: BenchmarkMetric[];
    historicalTrends: TrendPoint[];
  };
}

export interface ForecastPoint {
  date: Date;
  value: number;
  confidence: number;
}

export interface RiskForecast {
  riskType: string;
  probability: number;
  timeline: Date;
  impact: number;
}

export interface BenchmarkMetric {
  metric: string;
  ourValue: number;
  industryAverage: number;
  percentile: number;
}

export interface TrendPoint {
  date: Date;
  value: number;
  metric: string;
}