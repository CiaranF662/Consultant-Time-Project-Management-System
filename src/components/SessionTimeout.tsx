'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { FaExclamationTriangle, FaClock } from 'react-icons/fa';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout

export default function SessionTimeout() {
  const { data: session } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    signOut({ callbackUrl: '/login' });
  }, [clearAllTimers]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    // Set warning timer (show warning 2 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeLeft(WARNING_TIME);

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            handleLogout();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  }, [clearAllTimers, handleLogout]);

  const handleStayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Only set up timers if user is logged in
    if (!session?.user) {
      clearAllTimers();
      return;
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on any user activity
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    // Initialize timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      clearAllTimers();
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session, showWarning, resetTimer, clearAllTimers]);

  // Don't render if no session
  if (!session?.user) {
    return null;
  }

  // Format time left
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 border-2 border-yellow-500 dark:border-yellow-600">
        {/* Warning Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <FaExclamationTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center text-foreground mb-2">
          Session Timeout Warning
        </h2>

        {/* Message */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          You've been inactive for a while. Your session will expire in:
        </p>

        {/* Countdown */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-3">
            <FaClock className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 tabular-nums">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Logout Now
          </button>
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg"
          >
            Stay Logged In
          </button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          Click "Stay Logged In" to continue your session or you'll be automatically logged out.
        </p>
      </div>
    </div>
  );
}
