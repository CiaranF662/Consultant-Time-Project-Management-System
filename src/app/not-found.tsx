'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center p-4">
      <motion.div
        className="text-center max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
              <span className="text-white font-bold text-2xl relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
              <div className="flex items-center gap-1 relative z-10 -mt-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="w-3 h-1 bg-white rounded-full"></div>
              </div>
            </div>
            <span className="text-4xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 300, letterSpacing: '-0.02em' }}>agility</span>
          </div>
        </motion.div>

        {/* 404 Error */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Search className="w-6 h-6 text-muted-foreground" />
            <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Looks like this resource allocation went off the grid. The page you're looking for doesn't exist or has been moved.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium shadow-lg"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Helpful Links */}
        <motion.div
          className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-muted-foreground mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/dashboard/projects" className="text-blue-600 hover:text-blue-700 hover:underline">
              Projects
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/dashboard/gantt" className="text-blue-600 hover:text-blue-700 hover:underline">
              Timeline
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/dashboard/weekly-planner" className="text-blue-600 hover:text-blue-700 hover:underline">
              Weekly Planner
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/dashboard/budget" className="text-blue-600 hover:text-blue-700 hover:underline">
              Budget
            </Link>
          </div>
        </motion.div>

        {/* Footer Tagline */}
        <motion.p
          className="mt-12 text-sm text-muted-foreground italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Consultant planning all in one place
        </motion.p>
      </motion.div>
    </div>
  );
}
