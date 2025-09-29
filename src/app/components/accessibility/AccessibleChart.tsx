'use client';

import { useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface AccessibleChartProps {
  data: ChartData[];
  title: string;
  children: React.ReactNode; // The actual chart component
  type?: 'bar' | 'line' | 'pie';
}

export default function AccessibleChart({ data, title, children, type = 'bar' }: AccessibleChartProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'table' | 'summary'>('visual');
  const { theme } = useTheme();

  const generateSummary = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const max = Math.max(...data.map(item => item.value));
    const min = Math.min(...data.map(item => item.value));
    const maxItem = data.find(item => item.value === max);
    const minItem = data.find(item => item.value === min);

    return `${title} summary: Total of ${total} across ${data.length} items. 
            Highest value is ${maxItem?.name} with ${max}. 
            Lowest value is ${minItem?.name} with ${min}.`;
  };

  return (
    <div className="accessible-chart">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'visual' 
                ? 'bg-blue-600 text-white' 
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
            aria-pressed={viewMode === 'visual'}
          >
            Visual
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'table' 
                ? 'bg-blue-600 text-white' 
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
            aria-pressed={viewMode === 'table'}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'summary' 
                ? 'bg-blue-600 text-white' 
                : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
            aria-pressed={viewMode === 'summary'}
          >
            Summary
          </button>
        </div>
      </div>

      {viewMode === 'visual' && (
        <div role="img" aria-label={generateSummary()}>
          {children}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
            <thead>
              <tr className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                <th className={`border p-2 text-left ${theme === 'dark' ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}>
                  Item
                </th>
                <th className={`border p-2 text-right ${theme === 'dark' ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}>
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`border p-2 ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                    {item.name}
                  </td>
                  <td className={`border p-2 text-right ${theme === 'dark' ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
                    {item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'summary' && (
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
          <p>{generateSummary()}</p>
          <ul className="mt-3 space-y-1">
            {data.map((item, index) => (
              <li key={index}>
                {item.name}: {item.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}