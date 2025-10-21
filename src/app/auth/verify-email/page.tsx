'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Verify the email
    const verifyEmail = async () => {
      try {
        const response = await axios.post('/api/auth/verify-email', { token });
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');

        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.error ||
          'Failed to verify email. The link may have expired or is invalid.'
        );
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {status === 'verifying' && (
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <FaSpinner className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <FaCheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FaTimesCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
            {status === 'verifying' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h1>

          {/* Message */}
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            {status === 'success' && (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Redirecting to login page...
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Go to Login
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Link
                  href="/auth/pending-verification"
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Resend Verification Email
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Need help? Contact support at{' '}
          <a href="mailto:support@agility.com" className="text-blue-600 dark:text-blue-400 hover:underline">
            support@agility.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <FaSpinner className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
