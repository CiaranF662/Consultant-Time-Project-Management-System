import { FaCheckCircle, FaTimes, FaCheck, FaClock } from 'react-icons/fa';

type StatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
type BadgeSize = 'sm' | 'md' | 'lg';
type BadgeVariant = 'allocation' | 'weekly' | 'compact';

interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  variant?: BadgeVariant;
  count?: number;
  label?: string;
  className?: string;
}

export default function StatusBadge({
  status,
  size = 'md',
  variant = 'allocation',
  count,
  label,
  className = ''
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING':
        return {
          icon: FaClock,
          text: label || (count ? `${count} Week${count !== 1 ? 's' : ''} Pending Review` : 'Pending'),
          bgClass: 'bg-gradient-to-r from-orange-100 to-yellow-100',
          borderClass: 'border-orange-300',
          textClass: 'text-orange-800',
          iconClass: 'text-orange-600',
          dotClass: 'bg-orange-500',
          animate: true
        };
      case 'APPROVED':
        return {
          icon: variant === 'weekly' ? FaCheck : FaCheckCircle,
          text: label || (count ? `${count} Week${count !== 1 ? 's' : ''} Approved` : 'Approved'),
          bgClass: 'bg-gradient-to-r from-emerald-100 to-green-100',
          borderClass: 'border-emerald-300',
          textClass: 'text-emerald-800',
          iconClass: 'text-emerald-600',
          dotClass: 'bg-emerald-500',
          animate: false
        };
      case 'REJECTED':
        return {
          icon: FaTimes,
          text: label || (count ? `${count} Week${count !== 1 ? 's' : ''} Rejected` : 'Rejected'),
          bgClass: 'bg-gradient-to-r from-red-100 to-rose-100',
          borderClass: 'border-red-300',
          textClass: 'text-red-800',
          iconClass: 'text-red-600',
          dotClass: 'bg-red-500',
          animate: false
        };
      case 'MODIFIED':
        return {
          icon: FaCheck,
          text: label || 'Modified',
          bgClass: 'bg-gradient-to-r from-emerald-100 to-green-100',
          borderClass: 'border-emerald-300',
          textClass: 'text-emerald-800',
          iconClass: 'text-emerald-600',
          dotClass: 'bg-emerald-500',
          animate: false
        };
      default:
        return {
          icon: FaClock,
          text: 'Unknown',
          bgClass: 'bg-gray-100',
          borderClass: 'border-gray-300',
          textClass: 'text-gray-800',
          iconClass: 'text-gray-600',
          dotClass: 'bg-gray-500',
          animate: false
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          padding: 'px-2 py-1',
          textSize: 'text-xs',
          iconSize: 'w-2 h-2',
          dotSize: 'w-1.5 h-1.5'
        };
      case 'md':
        return {
          padding: 'px-3 py-1',
          textSize: 'text-xs',
          iconSize: 'w-3 h-3',
          dotSize: 'w-2 h-2'
        };
      case 'lg':
        return {
          padding: 'px-4 py-2',
          textSize: 'text-sm',
          iconSize: 'w-4 h-4',
          dotSize: 'w-2 h-2'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();
  const Icon = statusConfig.icon;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${sizeConfig.padding} ${statusConfig.bgClass} ${statusConfig.borderClass} rounded-full border ${className}`}>
        {status === 'PENDING' ? (
          <span className={`${sizeConfig.dotSize} ${statusConfig.dotClass} rounded-full ${statusConfig.animate ? 'animate-pulse shadow-sm' : ''}`}></span>
        ) : (
          <Icon className={`${sizeConfig.iconSize} ${statusConfig.iconClass}`} />
        )}
        <span className={`${sizeConfig.textSize} font-bold ${statusConfig.textClass}`}>
          {statusConfig.text}
        </span>
      </div>
    );
  }

  return (
    <span className={`flex items-center gap-2 ${sizeConfig.padding} ${statusConfig.bgClass} border ${statusConfig.borderClass} ${statusConfig.textClass} rounded-full ${sizeConfig.textSize} font-semibold shadow-sm ${className}`}>
      {status === 'PENDING' ? (
        <span className={`${sizeConfig.dotSize} ${statusConfig.dotClass} rounded-full ${statusConfig.animate ? 'animate-pulse shadow-sm' : ''}`}></span>
      ) : (
        <Icon className={sizeConfig.iconSize} />
      )}
      {statusConfig.text}
    </span>
  );
}