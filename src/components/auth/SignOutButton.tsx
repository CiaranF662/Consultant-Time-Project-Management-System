'use client';

import { signOut } from 'next-auth/react';
import { FaSignOutAlt } from 'react-icons/fa';

interface SignOutButtonProps {
  variant?: 'default' | 'icon' | 'text';
  className?: string;
}

export default function SignOutButton({ variant = 'default', className = '' }: SignOutButtonProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleSignOut}
        className={`p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
        title="Sign Out"
      >
        <FaSignOutAlt size={20} />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleSignOut}
        className={`flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-foreground ${className}`}
      >
        <FaSignOutAlt />
        Sign Out
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      className={`rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors ${className}`}
    >
      Sign Out
    </button>
  );
}