'use client';

export default function SkipLinks() {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#sidebar-nav" className="skip-link">
        Skip to navigation
      </a>
    </div>
  );
}