'use client';

import { GalleryVerticalEnd } from "lucide-react"

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-800">
          Sign In
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialsSubmit}>
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
          <div className="mb-2">
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

          <div className="mb-6 text-right">
            {/* You will need to create this page next */}
            <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 flex-shrink text-sm text-gray-500">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M43.6113 20.083H42V20H24V28H35.303C33.6747 32.6733 29.2235 36 24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C27.045 12 29.845 13.134 31.961 14.969L37.618 9.312C34.046 6.161 29.284 4 24 4C12.955 4 4 12.955 4 24C4 35.045 12.955 44 24 44C35.045 44 44 35.045 44 24C44 22.659 43.8627 21.35 43.6113 20.083Z" fill="#FFC107"/>
            <path d="M6.306 14.691L12.063 19.348C12.932 16.883 14.522 14.806 16.529 13.251L10.872 8.594C8.629 10.608 6.944 13.018 6.306 14.691Z" fill="#FF3D00"/>
            <path d="M24 44C35.045 44 44 35.045 44 24C44 22.659 43.8627 21.35 43.6113 20.083H24V28H35.303C34.51 30.245 33.099 32.088 31.253 33.437L36.91 39.094C41.083 35.533 44 30.089 44 24Z" fill="#4CAF50"/>
            <path d="M43.6113 20.083L43.5953 20H24V28H35.303C33.6747 32.6733 29.2235 36 24 36C17.373 36 12 30.627 12 24C12 17.373 17.373 12 24 12C27.045 12 29.845 13.134 31.961 14.969L37.618 9.312C34.046 6.161 29.284 4 24 4C12.955 4 4 12.955 4 24C4 35.045 12.955 44 24 44C35.045 44 44 35.045 44 24C44 22.659 43.8627 21.35 43.6113 20.083Z" fill="#1976D2"/>
          </svg>
          Sign in with Google
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}