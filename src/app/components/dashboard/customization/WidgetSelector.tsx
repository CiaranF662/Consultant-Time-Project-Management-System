'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { AVAILABLE_WIDGETS, getWidgetsByCategory } from '../widgets';
import { Widget, WidgetCategory } from '../types';

// #region Widget Selector Component
interface WidgetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: Widget) => void;
  existingWidgets: string[];
}

export default function WidgetSelector({ 
  isOpen, 
  onClose, 
  onAddWidget, 
  existingWidgets 
}: WidgetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory>('core');

  if (!isOpen) return null;

  const categories: { key: WidgetCategory; label: string; icon: string }[] = [
    { key: 'core', label: 'Core', icon: '⚡' },
    { key: 'productivity', label: 'Productivity', icon: '🚀' },
    { key: 'project', label: 'Project', icon: '📋' },
    { key: 'system', label: 'System', icon: '🖥️' }
  ];

  const availableWidgets = getWidgetsByCategory(selectedCategory)
    .filter(widget => !existingWidgets.includes(widget.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-96">
          {/* Categories Sidebar */}
          <div className="w-48 border-r bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Widgets Grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              {availableWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => {
                    onAddWidget(widget);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{widget.icon}</span>
                    <div>
                      <h4 className="font-semibold text-sm">{widget.name}</h4>
                      <p className="text-xs text-gray-500 capitalize">
                        {widget.defaultSize} • {widget.category}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{widget.description}</p>
                  
                  <div className="mt-3 flex justify-end">
                    <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {availableWidgets.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>No more widgets available in this category</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// #endregion