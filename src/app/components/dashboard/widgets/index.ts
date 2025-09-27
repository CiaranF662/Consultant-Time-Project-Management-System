// #region Widget Registry
import { Widget } from '../types';

// Core Widgets
import TimeWidget from './core/TimeWidget';
import WeatherWidget from './core/WeatherWidget';

// Productivity Widgets
import TodoWidget from './productivity/TodoWidget';

// Project Widgets
import ProjectStatsWidget from './project/ProjectStatsWidget';

// System Widgets
import SystemStatusWidget from './system/SystemStatusWidget';

export const AVAILABLE_WIDGETS: Widget[] = [
  // Core Widgets
  {
    id: 'time',
    name: 'Time & Date',
    component: TimeWidget,
    category: 'core',
    defaultSize: 'small',
    description: 'Display current time and date',
    icon: '🕐',
    configurable: true
  },
  {
    id: 'weather',
    name: 'Weather',
    component: WeatherWidget,
    category: 'core',
    defaultSize: 'medium',
    description: 'Current weather conditions',
    icon: '🌤️',
    configurable: true
  },

  // Productivity Widgets
  {
    id: 'todo',
    name: 'Todo List',
    component: TodoWidget,
    category: 'productivity',
    defaultSize: 'medium',
    description: 'Manage your daily tasks',
    icon: '✅'
  },

  // Project Widgets
  {
    id: 'project-stats',
    name: 'Project Stats',
    component: ProjectStatsWidget,
    category: 'project',
    defaultSize: 'medium',
    description: 'Overview of project metrics',
    icon: '📊'
  },

  // System Widgets
  {
    id: 'system-status',
    name: 'System Status',
    component: SystemStatusWidget,
    category: 'system',
    defaultSize: 'small',
    description: 'Monitor system performance',
    icon: '💻'
  }
];

export const getWidgetById = (id: string): Widget | undefined => {
  return AVAILABLE_WIDGETS.find(widget => widget.id === id);
};

export const getWidgetsByCategory = (category: string): Widget[] => {
  return AVAILABLE_WIDGETS.filter(widget => widget.category === category);
};
// #endregion