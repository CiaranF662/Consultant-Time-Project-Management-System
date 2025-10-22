'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ALWAYS_LIGHT_ROUTES = [
    '/',
    '/auth/login',
    '/auth/register',
    '/login',
    '/register'
];

export default function ThemeModeEnforcer(): null {
    const pathname = usePathname();

    useEffect(() => {
        const doc = document.documentElement;
        const matchesAlwaysLight = ALWAYS_LIGHT_ROUTES.some(
            (r) => pathname === r || pathname?.startsWith(r + '/')
        );

        if (matchesAlwaysLight) {
            // Force light: remove dark class and set a light flag
            doc.classList.remove('dark');
            doc.setAttribute('data-force-theme', 'light');
        } else {
            // Remove force flag and restore based on user preference
            doc.removeAttribute('data-force-theme');
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) doc.classList.add('dark');
            else doc.classList.remove('dark');
        }

        const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
        const onPrefChange = (e: MediaQueryListEvent) => {
            // only apply preference when not forcing light
            if (!matchesAlwaysLight) {
                if (e.matches) doc.classList.add('dark');
                else doc.classList.remove('dark');
            }
        };
        mql?.addEventListener?.('change', onPrefChange);

        return () => {
            mql?.removeEventListener?.('change', onPrefChange);
        };
    }, [pathname]);

    return null;
}