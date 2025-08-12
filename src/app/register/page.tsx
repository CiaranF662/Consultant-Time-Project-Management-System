'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
// Import the UserRole enum from Prisma to ensure type safety
import { UserRole } from '@prisma/client';

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
        router.push('/login?status=pending_approval');
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Create an Account
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* --- NEW ROLE SELECTION --- */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">I am a...</label>
            <div className="flex items-center space-x-6 rounded-md border border-gray-300 p-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center rounded-md p-2 transition-colors hover:bg-gray-100 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                <input
                  type="radio"
                  name="role"
                  value={UserRole.CONSULTANT}
                  checked={role === UserRole.CONSULTANT}
                  onChange={() => setRole(UserRole.CONSULTANT)}
                  className="sr-only" // Hide the default radio button
                />
                <span className="text-sm font-medium">Consultant</span>
              </label>
              <label className="flex flex-1 cursor-pointer items-center justify-center rounded-md p-2 transition-colors hover:bg-gray-100 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">
                <input
                  type="radio"
                  name="role"
                  value={UserRole.GROWTH_TEAM}
                  checked={role === UserRole.GROWTH_TEAM}
                  onChange={() => setRole(UserRole.GROWTH_TEAM)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">Growth Team</span>
              </label>
            </div>
          </div>
          {/* --- END NEW ROLE SELECTION --- */}

          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}