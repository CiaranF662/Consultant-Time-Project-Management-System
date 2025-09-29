'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaMoon, FaSun, FaBell, FaLock, FaCog, FaSave } from 'react-icons/fa';
import { useTheme } from '@/app/contexts/ThemeContext';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [tempTheme, setTempTheme] = useState<'light' | 'dark'>('light');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState<'preferences' | 'security'>('preferences');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      setTempTheme(theme);
      const savedEmailNotifications = localStorage.getItem('emailNotifications') !== 'false';
      const savedInAppNotifications = localStorage.getItem('inAppNotifications') !== 'false';

      setEmailNotifications(savedEmailNotifications);
      setInAppNotifications(savedInAppNotifications);
    }
  }, [status, router, theme]);



  const handlePreferencesSave = async () => {
    setIsSaving(true);
    
    try {
      // Apply theme change if different
      if (tempTheme !== theme) {
        toggleTheme();
      }
      
      // Save notification preferences
      localStorage.setItem('emailNotifications', emailNotifications.toString());
      localStorage.setItem('inAppNotifications', inAppNotifications.toString());
      
      // Show success popup
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out min-h-screen p-4 md:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-5xl mx-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg overflow-hidden`}>
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b px-6 py-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Settings
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Manage your application preferences and security settings
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'} border-b`}>
          <nav className="flex px-6">
            {[
              { key: 'preferences', label: 'Preferences', icon: FaCog },
              { key: 'security', label: 'Security', icon: FaLock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : `border-transparent ${theme === 'dark' ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-8">
              {/* Appearance */}
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                  <FaCog className="w-5 h-5" />
                  Display Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                    <div>
                      <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                        Theme
                      </label>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Choose between light and dark mode for better comfort
                      </p>
                    </div>
                    <button
                      onClick={() => setTempTheme(tempTheme === 'light' ? 'dark' : 'light')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        tempTheme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-yellow-400 hover:bg-gray-600'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tempTheme === 'dark' ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                      {tempTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                  <FaBell className="w-5 h-5" />
                  Notification Preferences
                </h3>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          Email Notifications
                        </label>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Receive important updates via email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          In-App Notifications
                        </label>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Show notification badge and alerts in the application
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={inAppNotifications}
                        onChange={(e) => setInAppNotifications(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border`}>
                    <p className={`text-xs ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'}`}>
                      <strong>Note:</strong> All preferences are saved when you click "Save Preferences".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handlePreferencesSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  <FaSave className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                  <FaLock className="w-5 h-5" />
                  Account Security
                </h3>

                {/* Password Change Notice */}
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-start gap-3">
                    <FaLock className={`w-5 h-5 mt-1 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                    <div>
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-orange-200' : 'text-orange-800'} mb-2`}>
                        Password Management
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'} mb-3`}>
                        Password changes are currently managed by system administrators.
                        The profile update API is not yet implemented.
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>
                        To change your password, please contact your system administrator or use the forgot password option on the login page.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-3`}>
                    Account Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Account Type:</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {session?.user?.role === 'GROWTH_TEAM' ? 'Growth Team' : 'Consultant'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Status:</span>
                      <span className="font-medium text-green-600">
                        Active
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Account ID:</span>
                      <span className={`font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {session?.user?.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Preferences saved successfully!
        </div>
      )}
    </div>
  );
}