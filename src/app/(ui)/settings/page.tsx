'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaMoon, FaSun, FaBell, FaLock, FaCog, FaSave } from 'react-icons/fa';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useNotification } from '@/app/contexts/NotificationContext';
import { useAccessibility } from '@/app/contexts/AccessibilityContext';
import { useFontSize } from '@/app/hooks/useFontSize';
import { useSimplifiedMode } from '@/app/hooks/useSimplifiedMode';
import axios from 'axios';
import Tooltip from '@/app/components/ui/Tooltip';
import HelpText from '@/app/components/ui/HelpText';

function SetPasswordForm() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    // Check if user has a password (Google users might not have one)
    const checkPasswordStatus = async () => {
      try {
        const response = await axios.get('/api/auth/check-password');
        setHasPassword(response.data.hasPassword);
      } catch (error) {
        console.error('Error checking password status:', error);
      }
    };
    
    if (session?.user) {
      checkPasswordStatus();
    }
  }, [session]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    
    setIsSettingPassword(true);
    
    try {
      await axios.post('/api/auth/set-password', { password });
      showSuccess('Password set successfully! You can now log in manually.');
      setPassword('');
      setConfirmPassword('');
      setHasPassword(true);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to set password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
        Password Management
      </h4>
      
      {!hasPassword ? (
        <div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            You signed up with Google. Set a password to enable manual login with your email and password.
          </p>
          
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Enter new password"
                required
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${theme === 'dark' ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="Confirm new password"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isSettingPassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSettingPassword ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>
        </div>
      ) : (
        <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
            ✓ Password is set. You can log in manually with your email and password, or continue using Google Sign-In.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { showSuccess } = useNotification();
  const { highContrast, toggleHighContrast, showTooltips, toggleTooltips } = useAccessibility();
  const { fontSize, setFontSize } = useFontSize();
  const { isSimplified, setIsSimplified } = useSimplifiedMode();

  const [tempTheme, setTempTheme] = useState<'light' | 'dark'>('light');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState<'preferences' | 'security'>('preferences');
  const [isSaving, setIsSaving] = useState(false);

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
      
      // Show success notification
      showSuccess('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="transition-all duration-300 ease-in-out min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className={`max-w-5xl mx-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg overflow-hidden`}>
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b px-6 py-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Settings
              </h1>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
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
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
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
                    <Tooltip content={`Switch to ${tempTheme === 'dark' ? 'light' : 'dark'} mode for better visibility`}>
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
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Accessibility */}
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <FaCog className="w-5 h-5" />
                  Accessibility Settings
                </h3>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          Show Tooltips
                        </label>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Display helpful tooltips throughout the application
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showTooltips}
                        onChange={toggleTooltips}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          High Contrast Mode
                        </label>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Increase contrast for better visibility
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={highContrast}
                        onChange={toggleHighContrast}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          Text Size
                        </label>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Adjust text size for better readability
                        </p>
                      </div>
                      <select
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value as any)}
                        className={`px-3 py-1 rounded border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="small">Small</option>
                        <option value="normal">Normal</option>
                        <option value="large">Large</option>
                        <option value="xlarge">Extra Large</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                          Simplified Mode
                        </label>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Reduce visual complexity and animations
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSimplified}
                        onChange={(e) => setIsSimplified(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
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
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                  <FaLock className="w-5 h-5" />
                  Account Security
                </h3>

                {/* Password Management */}
                <SetPasswordForm />

                {/* Account Info */}
                <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-3`}>
                    Account Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Account Type:</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
      

    </div>
  );
}