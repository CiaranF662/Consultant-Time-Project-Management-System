'use client';

import { useState, useEffect } from 'react';
import { DashboardWidget, Widget, WIDGET_SIZES } from '../types';
import { getWidgetById } from '../widgets';

// #region Dashboard Hook
export function useDashboard(userId: string) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard layout
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // For now, use localStorage. Replace with API call
        const saved = localStorage.getItem(`dashboard-${userId}`);
        if (saved) {
          setWidgets(JSON.parse(saved));
        } else {
          // Default widgets for new users
          const defaultWidgets: DashboardWidget[] = [
            {
              id: 'time-1',
              widgetType: 'time',
              position: { x: 0, y: 0 },
              size: 'small'
            },
            {
              id: 'project-stats-1',
              widgetType: 'project-stats',
              position: { x: 2, y: 0 },
              size: 'medium'
            }
          ];
          setWidgets(defaultWidgets);
        }
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [userId]);

  // Save dashboard layout
  const saveDashboard = (newWidgets: DashboardWidget[]) => {
    try {
      localStorage.setItem(`dashboard-${userId}`, JSON.stringify(newWidgets));
      setWidgets(newWidgets);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  // Add widget
  const addWidget = (widget: Widget) => {
    const newWidget: DashboardWidget = {
      id: `${widget.id}-${Date.now()}`,
      widgetType: widget.id,
      position: findNextPosition(),
      size: widget.defaultSize,
      config: {}
    };

    const updatedWidgets = [...widgets, newWidget];
    saveDashboard(updatedWidgets);
  };

  // Remove widget
  const removeWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    saveDashboard(updatedWidgets);
  };

  // Update widget position/size
  const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    const updatedWidgets = widgets.map(w => 
      w.id === widgetId ? { ...w, ...updates } : w
    );
    saveDashboard(updatedWidgets);
  };

  // Find next available position
  const findNextPosition = () => {
    const gridWidth = 12;
    const occupiedPositions = new Set();
    
    widgets.forEach(widget => {
      const size = WIDGET_SIZES[widget.size];
      for (let x = widget.position.x; x < widget.position.x + size.w; x++) {
        for (let y = widget.position.y; y < widget.position.y + size.h; y++) {
          occupiedPositions.add(`${x},${y}`);
        }
      }
    });

    // Find first available position
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x <= gridWidth - 2; x++) {
        if (!occupiedPositions.has(`${x},${y}`) && !occupiedPositions.has(`${x+1},${y}`)) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: 0 };
  };

  return {
    widgets,
    loading,
    addWidget,
    removeWidget,
    updateWidget,
    saveDashboard
  };
}
// #endregion