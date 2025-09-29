'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { useTheme } from './ThemeContext';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { theme } = useTheme();

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showSuccess = (message: string) => addNotification('success', message);
  const showError = (message: string) => addNotification('error', message);
  const showInfo = (message: string) => addNotification('info', message);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <FaCheckCircle className="h-5 w-5 text-green-400" />;
      case 'error': return <FaExclamationTriangle className="h-5 w-5 text-red-400" />;
      case 'info': return <FaInfoCircle className="h-5 w-5 text-blue-400" />;
      default: return null;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success': return theme === 'dark' ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200';
      case 'error': return theme === 'dark' ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200';
      case 'info': return theme === 'dark' ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200';
      default: return '';
    }
  };

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, showInfo }}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center p-4 border rounded-lg shadow-lg min-w-80 animate-in slide-in-from-right-full duration-300 ${getStyles(notification.type)}`}
          >
            {getIcon(notification.type)}
            <span className={`ml-3 flex-1 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {notification.message}
            </span>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`ml-3 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}