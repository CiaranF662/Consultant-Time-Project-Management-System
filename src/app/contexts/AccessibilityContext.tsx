'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  showTooltips: boolean;
  tooltipDelay: number;
  highContrast: boolean;
  reducedMotion: boolean;
  toggleTooltips: () => void;
  setTooltipDelay: (delay: number) => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setShowTooltips: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [showTooltips, setShowTooltips] = useState(true);
  const [tooltipDelay, setTooltipDelayState] = useState(500);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const savedTooltips = localStorage.getItem('accessibility-tooltips');
    const savedDelay = localStorage.getItem('accessibility-tooltip-delay');
    const savedContrast = localStorage.getItem('accessibility-high-contrast');
    const savedMotion = localStorage.getItem('accessibility-reduced-motion');

    if (savedTooltips !== null) setShowTooltips(JSON.parse(savedTooltips));
    if (savedDelay !== null) setTooltipDelayState(parseInt(savedDelay));
    if (savedContrast !== null) setHighContrast(JSON.parse(savedContrast));
    if (savedMotion !== null) setReducedMotion(JSON.parse(savedMotion));

    // Detect system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && savedMotion === null) {
      setReducedMotion(true);
    }
  }, []);

  const toggleTooltips = () => {
    const newValue = !showTooltips;
    setShowTooltips(newValue);
    localStorage.setItem('accessibility-tooltips', JSON.stringify(newValue));
  };

  const setShowTooltipsValue = (v: boolean) => {
    setShowTooltips(v);
    localStorage.setItem('accessibility-tooltips', JSON.stringify(v));
  };

  const setTooltipDelay = (delay: number) => {
    setTooltipDelayState(delay);
    localStorage.setItem('accessibility-tooltip-delay', delay.toString());
  };

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('accessibility-high-contrast', JSON.stringify(newValue));
    
    // Apply high contrast class to body
    if (newValue) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  };

  const setHighContrastValue = (v: boolean) => {
    setHighContrast(v);
    localStorage.setItem('accessibility-high-contrast', JSON.stringify(v));
    if (v) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');
  };

  const toggleReducedMotion = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    localStorage.setItem('accessibility-reduced-motion', JSON.stringify(newValue));
    
    // Apply reduced motion class to body
    if (newValue) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  };

  return (
    <AccessibilityContext.Provider value={{
      showTooltips,
      tooltipDelay,
      highContrast,
      reducedMotion,
      toggleTooltips,
      setTooltipDelay,
      toggleHighContrast,
      toggleReducedMotion,
      setShowTooltips: setShowTooltipsValue,
      setHighContrast: setHighContrastValue
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}