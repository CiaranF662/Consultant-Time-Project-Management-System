'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useGlobalShortcuts from '@/hooks/useGlobalShortcuts';
import SearchPalette from '@/components/accessibility/SearchPalette';
import ShortcutsOverlay from '@/components/accessibility/ShortcutsOverlay';

export default function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchRef = React.useRef<{ open?: () => void } | null>(null);
    const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

    const actions = {
        goDashboard: () => router.push('/dashboard'),
        openSearch: () => searchRef.current?.open?.(),
        openSettings: () => router.push('/settings'),
        toggleSidebar: () => document.dispatchEvent(new CustomEvent('toggle-sidebar')),
        refresh: () => {
            // SPA refresh - replace with router.refresh() if you want Next.js data refresh
            if ((router as any).refresh) {
                (router as any).refresh();
            } else {
                window.location.reload();
            }
        },
        closeOverlays: () => document.dispatchEvent(new CustomEvent('close-overlays')),
        openShortcuts: () => setShortcutsOpen(true),
        submitForm: () => document.dispatchEvent(new CustomEvent('global-submit')),
    };

    useGlobalShortcuts(actions);

    return (
        <>
            {children}
            <SearchPalette ref={searchRef} />
            <ShortcutsOverlay openProp={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </>
    );
}