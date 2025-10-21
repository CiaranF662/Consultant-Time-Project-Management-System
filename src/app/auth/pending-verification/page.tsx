'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { FaEnvelope, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';

export default function PendingVerificationPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setStatus('error');
      setMessage('Please enter your email address');
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const response = await axios.post('/api/auth/send-verification', { email });
      setStatus('success');
      setMessage(response.data.message || 'Verification email sent! Please check your inbox.');
    } catch (error: any) {
      setStatus('error');
      setMessage(
        error.response?.data?.error ||
        'Failed to send verification email. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <FaEnvelope className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h1>

          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Enter your email address to receive a new verification link
          </p>

          {/* Form */}
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:border-blue-500 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200"
                placeholder="your.email@example.com"
                required
                disabled={status === 'sending'}
              />
            </div>

            {/* Status Messages */}
            {status === 'success' && (
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      {message}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                      Check your spam folder if you don't see it in your inbox.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {message}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
            >
              {status === 'sending' ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FaEnvelope className="w-4 h-4" />
                  Send Verification Email
                </>
              )}
            </button>
          </form>

          {/* Additional Links */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already verified?{' '}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Go to Login
              </Link>
            </p>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> Verification links expire after 24 hours
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help? Contact{' '}
            <a href="mailto:support@agility.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              support@agility.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
