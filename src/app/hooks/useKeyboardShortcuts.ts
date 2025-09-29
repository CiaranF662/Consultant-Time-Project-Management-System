'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Ctrl/Cmd is pressed and not in input fields
      if (!(e.ctrlKey || e.metaKey) || 
          ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault();
          router.push('/dashboard');
          break;
        case 'p':
          e.preventDefault();
          router.push('/projects');
          break;
        case 'r':
          e.preventDefault();
          router.push('/reports');
          break;
        case 'a':
          e.preventDefault();
          router.push('/allocations');
          break;
        case 'g':
          e.preventDefault();
          router.push('/gantt');
          break;
        case ',':
          e.preventDefault();
          router.push('/settings');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);
}