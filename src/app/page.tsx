import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Calendar, Users, TrendingUp, Clock, CheckCircle, BarChart3 } from 'lucide-react';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">Agility</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 dark:text-gray-300 hover:text-foreground font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-foreground tracking-tight">
              Resource Planning
              <span className="block text-blue-600 dark:text-blue-400">Made Simple</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              A comprehensive platform for consultants and growth teams to manage projects,
              track resource allocation, and optimize sprint planning with precision and clarity.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/auth/register"
                className="bg-blue-600 text-white px-8 py-4 text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="bg-white dark:bg-gray-800 text-foreground px-8 py-4 text-lg font-semibold rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Everything you need to manage resources</h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">Powerful tools designed for modern consulting teams</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Sprint Planning</h3>
              <p className="text-gray-600 dark:text-gray-400">Organize projects into 2-week sprints with automated timeline management and phase allocation.</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Team Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Assign consultants to projects, track their availability, and manage role-based permissions.</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Time Allocation</h3>
              <p className="text-gray-600 dark:text-gray-400">Precise hour planning with weekly breakdowns and approval workflows for changes.</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Resource Timeline</h3>
              <p className="text-gray-600 dark:text-gray-400">Interactive timeline view showing consultant allocation across all projects and time periods.</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Approval Workflow</h3>
              <p className="text-gray-600 dark:text-gray-400">Structured approval process for hour changes with detailed tracking and notifications.</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Analytics & Insights</h3>
              <p className="text-gray-600 dark:text-gray-400">Track project progress, resource utilization, and generate reports for stakeholders.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to streamline your resource planning?</h2>
          <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">Join teams that trust Agility to manage their consulting resources efficiently.</p>
          <Link
            href="/auth/register"
            className="inline-block bg-white text-blue-600 px-8 py-4 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
          >
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Agility</span>
            </div>
            <p className="text-gray-400 dark:text-gray-500">© 2025 Agility. Built for modern consulting teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}