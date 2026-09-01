'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  initProgressTracker,
  resetProgress,
  markDataLoaded,
} from '@/lib/progress-tracker';

declare global {
  interface Window {
    __markDataLoaded?: (key: string) => void;
  }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__markDataLoaded = () => {
      markDataLoaded();
    };

    initProgressTracker();

    return () => {};
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    resetProgress();
    initProgressTracker();
  }, [pathname]);

  return <>{children}</>;
}
