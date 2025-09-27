'use client';

import { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useDashboard } from './hooks/useDashboard';
import { getWidgetById } from './widgets';
import { WIDGET_SIZES } from './types';
import WidgetSelector from './customization/WidgetSelector';

// #region Grid Layout Setup
const ResponsiveGridLayout = WidthProvider(Responsive);

interface CustomizableDashboardProps {
  userId: string;
}
// #endregion

// #region Main Dashboard Component
export default function CustomizableDashboard({ userId }: CustomizableDashboardProps) {
  const { widgets, loading, addWidget, removeWidget, updateWidget } = useDashboard(userId);
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3 h-32 bg-gray-200 rounded"></div>
            <div className="col-span-4 h-32 bg-gray-200 rounded"></div>
            <div className="col-span-5 h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Convert widgets to grid layout format
  const layouts = {
    lg: widgets.map(widget => {
      const size = WIDGET_SIZES[widget.size];
      return {
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: size.w,
        h: size.h,
        minW: size.w,
        minH: size.h
      };
    })
  };

  const handleLayoutChange = (layout: any[]) => {
    if (!isEditing) return;
    
    layout.forEach(item => {
      const widget = widgets.find(w => w.id === item.i);
      if (widget) {
        updateWidget(widget.id, {
          position: { x: item.x, y: item.y }
        });
      }
    });
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Customize your workspace</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWidgetSelector(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Widget
          </button>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isEditing 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Edit Mode Notice */}
      {isEditing && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            🎯 Edit mode active: Drag widgets to rearrange, click trash to remove
          </p>
        </div>
      )}

      {/* Widgets Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditing}
        isResizable={false}
        margin={[16, 16]}
      >
        {widgets.map(widget => {
          const widgetConfig = getWidgetById(widget.widgetType);
          if (!widgetConfig) return null;

          const WidgetComponent = widgetConfig.component;

          return (
            <div key={widget.id} className="relative group">
              {/* Widget Content */}
              <div className={`h-full ${isEditing ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}`}>
                <WidgetComponent
                  widgetId={widget.id}
                  size={widget.size}
                  config={widget.config}
                />
              </div>

              {/* Edit Controls */}
              {isEditing && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plus className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No widgets added yet
          </h3>
          <p className="text-gray-500 mb-4">
            Start customizing your dashboard by adding widgets
          </p>
          <button
            onClick={() => setShowWidgetSelector(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Widget
          </button>
        </div>
      )}

      {/* Widget Selector Modal */}
      <WidgetSelector
        isOpen={showWidgetSelector}
        onClose={() => setShowWidgetSelector(false)}
        onAddWidget={addWidget}
        existingWidgets={widgets.map(w => w.widgetType)}
      />
    </div>
  );
}
// #endregion