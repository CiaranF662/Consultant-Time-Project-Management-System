'use client';

import { useState, useEffect } from 'react';

export function useSimplifiedMode() {
  const [isSimplified, setIsSimplified] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('accessibility-simplified-mode');
    if (saved) setIsSimplified(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (isSimplified) {
      document.body.classList.add('simplified-mode');
    } else {
      document.body.classList.remove('simplified-mode');
    }
    
    localStorage.setItem('accessibility-simplified-mode', JSON.stringify(isSimplified));
  }, [isSimplified]);

  return { isSimplified, setIsSimplified };
}