import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { cn } from '@/lib/utils'

interface DashboardCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down'
    period: string
  }
  icon?: ReactNode
  className?: string
  loading?: boolean
}

export function DashboardCard({
  title,
  value,
  change,
  icon,
  className,
  loading = false
}: DashboardCardProps) {
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 bg-muted rounded w-24"></div>
          {icon && <div className="h-4 w-4 bg-muted rounded"></div>}
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-16 mb-2"></div>
          <div className="h-3 bg-muted rounded w-20"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground">
            <span className={cn(
              "font-medium",
              change.trend === 'up' ? "text-green-600" : "text-red-600"
            )}>
              {change.trend === 'up' ? '+' : ''}
              {change.value}%
            </span>{' '}
            from {change.period}
          </p>
        )}
      </CardContent>
    </Card>
  )
}