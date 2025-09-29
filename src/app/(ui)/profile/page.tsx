'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import Loading from '@/app/loading';
import { FaUser, FaSave } from 'react-icons/fa';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Profile Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentUserImage, setCurrentUserImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setAvatarPreview(session.user.image || null);
      setCurrentUserImage(session.user.image || null);

      // Load theme from localStorage
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
      setTheme(savedTheme);
      document.documentElement.className = savedTheme;
    }
  }, [status, session, router]);



  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('removeImage', 'true');
      
      await axios.put('/api/profile', formData);
      setAvatarPreview(null);
      setAvatar(null);
      setCurrentUserImage(null);
      alert('Profile picture removed successfully!');
      window.location.reload(); // Force page reload to update session
    } catch (err) {
      console.error(err);
      alert('Failed to remove profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    if (avatar) formData.append('profilePicture', avatar);

    try {
      setLoading(true);
      const response = await axios.put('/api/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // Update local state with new image path
      if (response.data.user.image) {
        setCurrentUserImage(response.data.user.image);
        setAvatarPreview(response.data.user.image);
      }
      
      alert('Profile updated successfully!');
      window.location.reload(); // Force page reload to update session
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };



  return (
      <div className={`transition-all duration-300 ease-in-out min-h-screen p-4 md:p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-5xl mx-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-lg overflow-hidden`}>
          {/* Header */}
          <div className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border-b px-6 py-4`}>
            <div>
              <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Profile Information
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Manage your personal account information
              </p>
            </div>
          </div>



          {/* Profile Content */}
          <div className="p-6">
            <div className="space-y-8">
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
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {(currentUserImage && currentUserImage.startsWith('/uploads/')) && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={loading}
                          className="text-sm px-4 py-2 rounded-full border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Remove Picture
                        </button>
                      )}
                    </div>
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
            </div>
          </div>
        </div>
      </div>
  );
}
