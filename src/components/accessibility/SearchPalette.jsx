import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import Modal from '@/components/accessibility/Modal';

const SearchPalette = forwardRef((props, ref) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));

  useEffect(() => {
    function onClose() {
      setOpen(false);
    }
    document.addEventListener('close-overlays', onClose);
    return () => document.removeEventListener('close-overlays', onClose);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Search" labelledBy="search-title">
      <div role="search" className="search-palette">
        <input
          ref={inputRef}
          aria-labelledby="search-title"
          placeholder="Search projects, tasks, people..."
          onKeyDown={(e) => {
            // keep default Tab behavior; allow Enter to select
            if (e.key === 'Enter') {
              // implement search submit or selection behavior
            }
          }}
        />
        {/* results area */}
      </div>
    </Modal>
  );
});

export default SearchPalette;