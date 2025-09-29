'use client';

import { useState, useEffect } from 'react';

type FontSize = 'small' | 'normal' | 'large' | 'xlarge';

export function useFontSize() {
  const [fontSize, setFontSize] = useState<FontSize>('normal');

  useEffect(() => {
    const saved = localStorage.getItem('accessibility-font-size') as FontSize;
    if (saved) setFontSize(saved);
  }, []);

  useEffect(() => {
    const sizes = {
      small: '14px',
      normal: '16px',
      large: '18px',
      xlarge: '20px'
    };

    document.documentElement.style.fontSize = sizes[fontSize];
    localStorage.setItem('accessibility-font-size', fontSize);
  }, [fontSize]);

  const increaseFontSize = () => {
    const sizes: FontSize[] = ['small', 'normal', 'large', 'xlarge'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const sizes: FontSize[] = ['small', 'normal', 'large', 'xlarge'];
    const currentIndex = sizes.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1]);
    }
  };

  return { fontSize, setFontSize, increaseFontSize, decreaseFontSize };
}