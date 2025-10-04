'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { BarChart3, User, Users2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Add state to manage the selected role, defaulting to CONSULTANT
  const [role, setRole] = useState<UserRole>(UserRole.CONSULTANT);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      // Pass the selected role in the API request body
      await axios.post('/api/register', {
        name,
        email,
        password,
        role,
      });

      // Redirect based on the role selected
      if (role === UserRole.GROWTH_TEAM) {
        // This is the only line that has been changed
        router.push('/pending-approval');
      } else {
        router.push('/login?status=registered');
      }
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Agility</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-gray-600 dark:text-gray-300">Join thousands of teams managing resources efficiently</p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-4 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-3">
                I am joining as a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`
                  relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all
                  ${role === UserRole.CONSULTANT
                    ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}>
                  <input
                    type="radio"
                    name="role"
                    value={UserRole.CONSULTANT}
                    checked={role === UserRole.CONSULTANT}
                    onChange={() => setRole(UserRole.CONSULTANT)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center mr-3
                      ${role === UserRole.CONSULTANT ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}
                    `}>
                      <User className={`w-4 h-4 ${role === UserRole.CONSULTANT ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${role === UserRole.CONSULTANT ? 'text-blue-900 dark:text-blue-100' : 'text-foreground'}`}>
                        Consultant
                      </div>
                      <div className={`text-xs ${role === UserRole.CONSULTANT ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                        Execute projects
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`
                  relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all
                  ${role === UserRole.GROWTH_TEAM
                    ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}>
                  <input
                    type="radio"
                    name="role"
                    value={UserRole.GROWTH_TEAM}
                    checked={role === UserRole.GROWTH_TEAM}
                    onChange={() => setRole(UserRole.GROWTH_TEAM)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center mr-3
                      ${role === UserRole.GROWTH_TEAM ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}
                    `}>
                      <Users2 className={`w-4 h-4 ${role === UserRole.GROWTH_TEAM ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${role === UserRole.GROWTH_TEAM ? 'text-blue-900 dark:text-blue-100' : 'text-foreground'}`}>
                        Growth Team
                      </div>
                      <div className={`text-xs ${role === UserRole.GROWTH_TEAM ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>
                        Manage resources
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-card-foreground mb-2">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-foreground bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-card-foreground mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-foreground bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Enter your email"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-foreground bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Create a password"
              />
              <p className="mt-1 text-xs text-muted-foreground">Must be at least 6 characters</p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-card-foreground mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-foreground bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Confirm your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Create account
            </button>
          </form>
        </div>

        {/* Sign in link */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}