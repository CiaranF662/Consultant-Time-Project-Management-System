import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth'; // Corrected import path

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // If the user is already logged in, redirect them directly to the dashboard.
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-800">
          Consultant Time & Project Management
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          A streamlined system for consultants and growth teams to manage projects, sprints, and time allocation with precision.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/login"
            className="inline-block py-3 px-6 text-lg font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-block py-3 px-6 text-lg font-medium rounded-md text-blue-500 bg-white border border-blue-500 hover:bg-blue-50"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}