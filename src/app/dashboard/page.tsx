import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth'; // <--- CORRECT IMPORT PATH
import SignOutButton from '@/app/components/SignOutButton';
// You can add Prisma and other imports back here when you build out the full dashboard
// import { PrismaClient } from '@prisma/client';
// import Link from 'next/link';
// import ProjectCard from '@/app/components/ProjectCard';
// import { FaPlus } from "react-icons/fa";

// const prisma = new PrismaClient();

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // For now, we are just displaying a welcome message.
  // We will add the project fetching logic back in later.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome to the Dashboard
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          You are signed in as{' '}
          <span className="font-semibold">{session.user.name || session.user.email}</span>.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Your role is: <span className="font-medium uppercase">{session.user.role}</span>
        </p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}