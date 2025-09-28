import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'

const activities = [
  {
    id: '1',
    user: 'Sarah Chen',
    action: 'assigned to',
    project: 'E-commerce Platform',
    time: '2 hours ago',
    type: 'allocation'
  },
  {
    id: '2',
    user: 'Mike Johnson',
    action: 'completed phase',
    project: 'Mobile App Redesign',
    time: '4 hours ago',
    type: 'milestone'
  },
  {
    id: '3',
    user: 'Emma Wilson',
    action: 'requested approval for',
    project: 'Data Migration Project',
    time: '6 hours ago',
    type: 'approval'
  },
  {
    id: '4',
    user: 'David Kim',
    action: 'logged 8 hours on',
    project: 'API Development',
    time: '8 hours ago',
    type: 'timesheet'
  },
  {
    id: '5',
    user: 'Lisa Park',
    action: 'raised conflict for',
    project: 'Cloud Migration',
    time: '1 day ago',
    type: 'conflict'
  }
]

const getActivityColor = (type: string) => {
  switch (type) {
    case 'allocation': return 'bg-blue-500'
    case 'milestone': return 'bg-green-500'
    case 'approval': return 'bg-yellow-500'
    case 'timesheet': return 'bg-purple-500'
    case 'conflict': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

export function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {activity.user.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">{activity.user}</span>{' '}
              {activity.action}{' '}
              <span className="font-medium">{activity.project}</span>
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type)}`}></div>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}