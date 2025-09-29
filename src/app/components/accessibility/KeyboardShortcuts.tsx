'use client';

import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useState } from 'react';

export default function KeyboardShortcuts() {
  useKeyboardShortcuts();
  const { theme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = [
    { key: 'Ctrl/Cmd + D', action: 'Go to Dashboard' },
    { key: 'Ctrl/Cmd + P', action: 'Go to Projects' },
    { key: 'Ctrl/Cmd + R', action: 'Go to Reports' },
    { key: 'Ctrl/Cmd + A', action: 'Go to Allocations' },
    { key: 'Ctrl/Cmd + G', action: 'Go to Gantt Chart' },
    { key: 'Ctrl/Cmd + ,', action: 'Go to Settings' },
    { key: 'Escape', action: 'Close modals' },
    { key: 'Tab', action: 'Navigate between elements' },
  ];

  return (
    <>
      <button
        onClick={() => setShowHelp(!showHelp)}
        className={`fixed bottom-4 right-4 p-3 rounded-full shadow-lg z-50 ${
          theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
        }`}
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (Ctrl+?)"
      >
        ⌨️
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-lg shadow-xl ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Keyboard Shortcuts
              </h2>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {shortcut.action}
                    </span>
                    <kbd className={`px-2 py-1 text-xs rounded ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                data-close
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}