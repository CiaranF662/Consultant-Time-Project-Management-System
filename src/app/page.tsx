'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Calendar, Users, TrendingUp, Clock, CheckCircle, ArrowRight, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden group-hover:shadow-xl transition-shadow">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
                <span className="text-white font-bold text-lg relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
                <div className="flex items-center gap-0.5 relative z-10 -mt-0.5">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-2 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>
              <span className="text-3xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 300, letterSpacing: '-0.02em' }}>agility</span>
            </Link>
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
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Brand Logo in Hero */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
                <span className="text-white font-bold text-3xl relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
                <div className="flex items-center gap-1 relative z-10 -mt-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <div className="w-3 h-1 bg-white rounded-full"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Zap className="w-4 h-4" />
              Stop wasting hours on spreadsheets
            </motion.div>

            <h1 className="text-5xl sm:text-7xl font-bold text-foreground tracking-tight leading-tight mb-4">
              Resource Planning That
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Actually Works</span>
            </h1>
            <p className="text-lg text-muted-foreground font-medium mb-4 italic">Powered by Agility</p>
            <p className="mt-8 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Replace your manual Airtable chaos with automated resource allocation.
              <span className="font-semibold text-foreground"> See consultant capacity in real-time</span>,
              plan sprints visually, and get instant approval workflows.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
              >
                Start Planning Smarter
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Stats */}
            <motion.div
              className="mt-12 flex flex-wrap justify-center gap-8 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-600 dark:text-gray-300">Save <strong className="text-foreground">10+ hours/week</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-600 dark:text-gray-300"><strong className="text-foreground">Zero</strong> spreadsheet updates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-600 dark:text-gray-300">Real-time <strong className="text-foreground">capacity tracking</strong></span>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Screenshot */}
          <motion.div
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-purple-600/10 z-10"></div>
              <Image
                src="/screenshots/timeline-view.png"
                alt="Consultant Allocation Timeline - See all your team's capacity at a glance"
                width={1920}
                height={1080}
                className="w-full h-auto"
                priority
              />
            </div>
            {/* Floating badges */}
            <motion.div
              className="absolute -top-6 -left-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Resource Utilization</div>
                  <div className="text-lg font-bold text-foreground">92%</div>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="absolute -bottom-6 -right-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Time Saved Weekly</div>
                  <div className="text-lg font-bold text-foreground">12 hours</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>


      {/* Problem/Solution Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">Sound Familiar?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              If you're managing consultants, you know the pain
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Before (Problems) */}
            <motion.div
              className="bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">😫</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground">Without Agility</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Hours wasted updating Airtable manually",
                  "No idea who's available next week",
                  "Budget vs. actual always out of sync",
                  "Consultants don't know their schedule",
                  "Approval requests lost in email chains",
                  "Growth team blind to capacity issues"
                ].map((problem, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-red-500 mt-1">✗</span>
                    <span>{problem}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* After (Solutions) */}
            <motion.div
              className="bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-800 rounded-2xl p-8"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground">With Agility</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Automatic allocation tracking across all projects",
                  "Real-time capacity view for every consultant",
                  "Budget tracking updated instantly",
                  "Consultants see their full schedule at a glance",
                  "Built-in approval workflow with notifications",
                  "Interactive timeline shows bottlenecks instantly"
                ].map((solution, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{solution}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">From project creation to weekly execution in 4 simple steps</p>
          </motion.div>

          <div className="space-y-24">
            {/* Step 1 */}
            <motion.div
              className="grid md:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="order-2 md:order-1">
                <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  Step 1
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">Growth Team Creates Project</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Set up a new project in seconds. Define the total budget, assign a Product Manager,
                  and select team consultants. Sprints are generated automatically.
                </p>
                <ul className="space-y-3">
                  {[
                    "Set total budgeted hours",
                    "Assign Product Manager",
                    "Add team consultants",
                    "2-week sprints auto-generated"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 md:order-2">
                <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                  <Image
                    src="/screenshots/create-project-modal.png"
                    alt="Create new project with budget and team assignment"
                    width={800}
                    height={600}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              className="grid md:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <Image
                  src="/screenshots/project-detail.png"
                  alt="Product Manager allocates hours to project phases"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  Step 2
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">PM Plans Phases & Allocations</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Product Managers create phases, link them to sprints, and allocate hours to each consultant.
                  Budget tracking is automatic and visual.
                </p>
                <ul className="space-y-3">
                  {[
                    "Create phases linked to sprints",
                    "Allocate hours per consultant",
                    "See budget usage in real-time",
                    "Track planning vs. work progress"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              className="grid md:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="order-2 md:order-1">
                <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  Step 3
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">Consultants Plan Their Weeks</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Consultants see all their assigned projects and distribute hours week by week.
                  Color-coded status shows what needs attention.
                </p>
                <ul className="space-y-3">
                  {[
                    "See all project allocations",
                    "Distribute hours across weeks",
                    "Visual progress indicators",
                    "Request hour changes with approval flow"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 md:order-2">
                <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                  <Image
                    src="/screenshots/weekly-planner.png"
                    alt="Consultant weekly hour planner with project cards"
                    width={800}
                    height={600}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </motion.div>

            {/* Step 4 */}
            <motion.div
              className="grid md:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
                <Image
                  src="/screenshots/timeline-view.png"
                  alt="Interactive resource timeline showing all consultant allocations"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  Step 4
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">Track Everything in Real-Time</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Growth Team sees the complete picture. Click any cell to drill into details.
                  Export to Excel with perfect formatting for stakeholder reports.
                </p>
                <ul className="space-y-3">
                  {[
                    "Interactive timeline grid view",
                    "Color-coded capacity indicators",
                    "Click cells for detailed breakdown",
                    "Export to Excel with formatting"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-foreground mb-4">Built for Every Role</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Tailored workflows for Growth Teams, Product Managers, and Consultants</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Users className="w-8 h-8" />,
                color: "blue",
                role: "Growth Team",
                tagline: "Strategic Resource Oversight",
                benefits: [
                  "See all consultant capacity at a glance",
                  "Identify bottlenecks before they happen",
                  "Approve hour changes in seconds",
                  "Export polished reports for stakeholders"
                ]
              },
              {
                icon: <Target className="w-8 h-8" />,
                color: "purple",
                role: "Product Managers",
                tagline: "Effortless Project Planning",
                benefits: [
                  "Create phases and link to sprints visually",
                  "Allocate team hours with budget guardrails",
                  "Track planning vs. actual progress",
                  "Automatically manage consultant assignments"
                ]
              },
              {
                icon: <Calendar className="w-8 h-8" />,
                color: "green",
                role: "Consultants",
                tagline: "Clear Weekly Schedules",
                benefits: [
                  "See your full allocation in one place",
                  "Plan hours week by week with ease",
                  "Request changes with built-in approval",
                  "Know exactly what's expected each sprint"
                ]
              }
            ].map((useCase, i) => (
              <motion.div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 hover:shadow-xl transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`w-16 h-16 bg-${useCase.color}-100 dark:bg-${useCase.color}-900/30 rounded-xl flex items-center justify-center mb-6 text-${useCase.color}-600 dark:text-${useCase.color}-400`}>
                  {useCase.icon}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{useCase.role}</h3>
                <p className="text-sm text-muted-foreground mb-6">{useCase.tagline}</p>
                <ul className="space-y-3">
                  {useCase.benefits.map((benefit, j) => (
                    <li key={j} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                      <CheckCircle className={`w-5 h-5 text-${useCase.color}-600 flex-shrink-0 mt-0.5`} />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Stop Wrestling With Spreadsheets?</h2>
            <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">
              Start planning smarter with automated resource management
            </p>
            <div className="flex justify-center">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-blue-200">No credit card required • Set up in 10 minutes • Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent"></div>
                <span className="text-white font-bold text-lg relative z-10" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 }}>a</span>
                <div className="flex items-center gap-0.5 relative z-10 -mt-0.5">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-2 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 300, letterSpacing: '-0.02em' }}>agility</span>
                <span className="text-sm text-gray-400 -mt-1">Consultant planning all in one place</span>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-lg text-gray-300 max-w-md">
              Consultant planning all in one place
            </p>

            {/* Copyright */}
            <div className="pt-4 border-t border-gray-800 w-full">
              <p className="text-sm text-gray-500">
                © 2025 Agility. Built for modern consulting teams.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
