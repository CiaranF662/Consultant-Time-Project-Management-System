'use client';

import React, { useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';

type Props = {
    openProp?: boolean;
    onClose?: () => void;
};

export default function ShortcutsOverlay({ openProp = false, onClose }: Props) {
    const [open, setOpen] = useState(openProp);

    useEffect(() => setOpen(openProp), [openProp]);

    useEffect(() => {
        function onCloseListener() {
            setOpen(false);
            onClose?.();
        }
        document.addEventListener('close-overlays', onCloseListener);
        return () => document.removeEventListener('close-overlays', onCloseListener);
    }, [onClose]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                setOpen(false);
                onClose?.();
            }
        }
        if (open) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            aria-hidden={!open}
            className="shortcuts-overlay-backdrop"
            onClick={() => {
                setOpen(false);
                onClose?.();
            }}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <FocusTrap
                focusTrapOptions={{
                    clickOutsideDeactivates: true,
                    escapeDeactivates: false, // handled above
                    initialFocus: undefined,
                }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="shortcuts-title"
                    className="shortcuts-overlay-panel"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: '#fff',
                        color: '#111',
                        borderRadius: 8,
                        padding: '1.25rem',
                        width: 'min(720px, 90%)',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    }}
                >
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 id="shortcuts-title" style={{ margin: 0, fontSize: '1.125rem' }}>
                            Keyboard Shortcuts
                        </h2>
                        <div>
                            <button
                                aria-label="Close shortcuts"
                                onClick={() => {
                                    setOpen(false);
                                    onClose?.();
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '1.25rem',
                                    cursor: 'pointer',
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </header>

                    <main style={{ marginTop: '0.75rem' }}>
                        <p style={{ marginTop: 0, color: '#444' }}>
                            Use these keyboard shortcuts anywhere in the app. Press Esc to close.
                        </p>

                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', width: '40%', fontWeight: 600 }}>Ctrl/Cmd + D</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Go to Dashboard</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Ctrl + K</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Open Search</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>/</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Focus Search (unless typing in a field)</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Ctrl + ,</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Open Settings</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Ctrl + B</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Toggle Sidebar</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Ctrl + R</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Refresh page / data</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Ctrl/Cmd + Enter</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Submit current form</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Tab / Shift + Tab</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Next / previous field</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Enter / Space</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Activate focused element</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>Esc</td>
                                    <td style={{ padding: '0.5rem 0.75rem' }}>Close modals, dropdowns, side panels</td>
                                </tr>
                            </tbody>
                        </table>

                        <footer style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    onClose?.();
                                }}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    background: '#0070f3',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                }}
                            >
                                Close
                            </button>
                        </footer>
                    </main>
                </div>
            </FocusTrap>
        </div>
    );
}