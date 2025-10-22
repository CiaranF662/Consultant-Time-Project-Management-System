'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/navigation/add-sidebar';
import Loading from '@/app/loading';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    const sizeClasses = {
      sm: "w-8 h-8",
      md: "w-12 h-12",
      lg: "w-16 h-16"
    };

    const dotSizes = {
      sm: "w-2 h-2",
      md: "w-3 h-3",
      lg: "w-4 h-4"
    };

    return (
      <Loading className={cn("min-h-screen flex items-center justify-center", sizeClasses["lg"])} />
    )
  }

  if (!session) {
    return null;
  }

  return (
    <Sidebar>
      {children}
    </Sidebar>
  );
}