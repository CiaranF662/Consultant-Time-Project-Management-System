import { useEffect } from 'react';

export default function useGlobalShortcuts(actions = {}) {
  // actions: { goDashboard, openSearch, openSettings, toggleSidebar, refresh, closeOverlays, openShortcuts }
  useEffect(() => {
    function isTypingInField(e) {
      const t = e.target;
      return (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      );
    }

    function onKeyDown(e) {
      const meta = e.metaKey; // Cmd on Mac
      const ctrl = e.ctrlKey;
      const cmdOrCtrl = meta || ctrl;

      // Ctrl/Cmd+D -> Dashboard
      if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        actions.goDashboard?.();
        return;
      }

      // Ctrl+K OR / -> Search
      if ((cmdOrCtrl && e.key.toLowerCase() === 'k') || e.key === '/') {
        // allow typing when focus is in an input/textarea for '/'
        if (e.key === '/' && isTypingInField(e)) return;
        e.preventDefault();
        actions.openSearch?.();
        return;
      }

      // Ctrl+, -> Settings
      if (cmdOrCtrl && e.key === ',') {
        e.preventDefault();
        actions.openSettings?.();
        return;
      }

      // Ctrl+B -> toggle sidebar
      if (cmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        actions.toggleSidebar?.();
        return;
      }

      // Ctrl+R -> refresh (SPA)
      if (cmdOrCtrl && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        actions.refresh?.();
        return;
      }

      // Ctrl/Cmd+Enter -> submit (handled at form level, but fire global if provided)
      if (cmdOrCtrl && e.key === 'Enter') {
        actions.submitForm?.();
        return;
      }

      // Shift+? -> open shortcuts overlay
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        actions.openShortcuts?.();
        return;
      }

      // Esc -> close overlays
      if (e.key === 'Escape' || e.key === 'Esc') {
        actions.closeOverlays?.();
        return;
      }

      // Tab / Shift+Tab: intentionally not intercepted - preserve native focus order
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    actions.goDashboard,
    actions.openSearch,
    actions.openSettings,
    actions.toggleSidebar,
    actions.refresh,
    actions.closeOverlays,
    actions.submitForm,
    actions.openShortcuts,
  ]);
}