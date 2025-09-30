'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import DashboardLayout from '@/components/DashboardLayout';
import Loading from '@/app/loading';
import { FaMoon, FaSun, FaBell, FaUser, FaLock, FaCog, FaSave } from 'react-icons/fa';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Profile Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // System Preferences
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setAvatarPreview(session.user.image || null);

      // Load user preferences from localStorage
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
      const savedEmailNotifications = localStorage.getItem('emailNotifications') !== 'false';
      const savedInAppNotifications = localStorage.getItem('inAppNotifications') !== 'false';

      setTheme(savedTheme);
      setEmailNotifications(savedEmailNotifications);
      setInAppNotifications(savedInAppNotifications);

      // Apply theme to document
      document.documentElement.className = savedTheme;
    }
  }, [status, session, router]);

  // Theme toggle handler
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.className = newTheme;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleProfileUpdate = async () => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    if (avatar) formData.append('avatar', avatar);

    try {
      setLoading(true);
      await axios.put('/api/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Profile updated successfully!');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSave = () => {
    // Save preferences to localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('emailNotifications', emailNotifications.toString());
    localStorage.setItem('inAppNotifications', inAppNotifications.toString());

    alert('Preferences saved successfully!');
  };

  if (status === 'loading') {
    return (
      <Loading className="min-h-screen flex items-center justify-center"  />
    );
  }

  return (
    <DashboardLayout>
      <div className={`transition-all duration-300 ease-in-out min-h-screen p-4 md:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-5xl mx-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg overflow-hidden`}>
          {/* Header */}
          <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b px-6 py-4`}>
            <div className="flex justify-between items-center">
              <div>
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Profile & Settings
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage your account information and preferences
                </p>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-600 hover:bg-gray-500 text-yellow-400'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <FaSun className="w-5 h-5" /> : <FaMoon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'} border-b`}>
            <nav className="flex px-6">
              {[
                { key: 'profile', label: 'Profile Information', icon: FaUser },
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
            {/* Profile Information Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* Avatar Section */}
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full border-4 border-gray-200 flex items-center justify-center bg-gray-100 mb-4">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="w-32 h-32 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <span className="text-white text-4xl font-bold">
                            {(session?.user?.name || session?.user?.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                          Account Type
                        </label>
                        <input
                          type="text"
                          value={session?.user?.role === 'GROWTH_TEAM' ? 'Growth Team Member' : 'Consultant'}
                          readOnly
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none ${
                            theme === 'dark' ? 'bg-gray-600 border-gray-500 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'
                          } cursor-not-allowed`}
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                          Account Status
                        </label>
                        <input
                          type="text"
                          value="Active"
                          readOnly
                          className={`w-full border rounded-lg px-3 py-2 focus:outline-none ${
                            theme === 'dark' ? 'bg-gray-600 border-gray-500 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-600'
                          } cursor-not-allowed`}
                        />
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'} border`}>
                      <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-blue-800'} mb-2`}>
                        Account Information
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-blue-700'}`}>
                        Your account type and status are managed by the system administrators.
                        {session?.user?.role === 'GROWTH_TEAM'
                          ? ' As a Growth Team member, you have access to project management and resource allocation features.'
                          : ' As a Consultant, you can view your allocations and manage your time tracking.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleProfileUpdate}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <FaSave className="w-4 h-4" />
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </div>
            )}

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
                        onClick={toggleTheme}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-yellow-400 hover:bg-gray-600'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {theme === 'dark' ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
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
                        <strong>Note:</strong> These preferences are currently saved locally and will affect future notification functionality.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handlePreferencesSave}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <FaSave className="w-4 h-4" />
                    Save Preferences
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
      </div>
    </DashboardLayout>
  );
}
