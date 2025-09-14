'use client';

import { useState } from 'react';
import { Bell, Check, X, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { UserRole } from '@prisma/client';

interface Notification {
  id: string;
  type: 'approval' | 'alert' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  actionable?: boolean;
  actionUrl?: string;
  read?: boolean;
}

interface PendingApproval {
  id: string;
  type: 'hour_change' | 'project_assignment' | 'budget_adjustment';
  requestor: string;
  project: string;
  details: string;
  timestamp: Date;
  urgent?: boolean;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedProject?: string;
  timestamp: Date;
  resolved?: boolean;
}

interface NotificationCenterProps {
  notifications: Notification[];
  pendingApprovals: PendingApproval[];
  alerts: Alert[];
  userRole: UserRole;
}

/**
 * NotificationCenter - Centralized notification and approval system
 * 
 * Features:
 * - Role-based notification filtering
 * - Actionable approvals with direct actions
 * - Real-time alert management
 * - Bulk actions for efficiency
 */
export default function NotificationCenter({
  notifications,
  pendingApprovals,
  alerts,
  userRole
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate total unread count
  const totalCount = notifications.filter(n => !n.read).length + 
                    pendingApprovals.length + 
                    alerts.filter(a => !a.resolved).length;

  const handleApprovalAction = async (approvalId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/hour-changes/${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' })
      });
      
      if (response.ok) {
        // Refresh notifications
        window.location.reload(); // In production, use proper state management
      }
    } catch (error) {
      console.error('Failed to process approval:', error);
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    // Implement mark as read logic
    console.log('Marking as read:', notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {totalCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {totalCount > 99 ? '99+' : totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-500">
            {totalCount} unread items
          </p>
        </div>

        <ScrollArea className="max-h-96">
          {/* Pending Approvals (Growth Team only) */}
          {userRole === UserRole.GROWTH_TEAM && pendingApprovals.length > 0 && (
            <div className="p-3 border-b">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Pending Approvals ({pendingApprovals.length})
              </h4>
              <div className="space-y-2">
                {pendingApprovals.slice(0, 3).map((approval) => (
                  <div key={approval.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-blue-800">
                          {approval.type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          {approval.requestor} • {approval.project}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {approval.details}
                        </div>
                      </div>
                      {approval.urgent && (
                        <Badge variant="destructive" className="text-xs ml-2">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleApprovalAction(approval.id, 'approve')}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleApprovalAction(approval.id, 'reject')}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                
                {pendingApprovals.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View all {pendingApprovals.length} approvals
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Critical Alerts */}
          {alerts.filter(a => !a.resolved).length > 0 && (
            <div className="p-3 border-b">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Active Alerts ({alerts.filter(a => !a.resolved).length})
              </h4>
              <div className="space-y-2">
                {alerts.filter(a => !a.resolved).slice(0, 3).map((alert) => (
                  <div key={alert.id} className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {alert.title}
                        </div>
                        <div className="text-xs mt-1 opacity-90">
                          {alert.description}
                        </div>
                        {alert.affectedProject && (
                          <div className="text-xs mt-1 opacity-75">
                            Project: {alert.affectedProject}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Notifications */}
          {notifications.length > 0 && (
            <div className="p-3">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Recent Updates
              </h4>
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notification) => (
                  <div 
                    key={notification.id}
                    className={`flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {notification.message}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {totalCount === 0 && (
            <div className="p-6 text-center">
              <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-500">
                All caught up! No new notifications.
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        {totalCount > 0 && (
          <div className="p-3 border-t">
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="flex-1 text-xs">
                Mark all as read
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 text-xs">
                View all
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Helper function to format timestamps
 */
function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return timestamp.toLocaleDateString();
}