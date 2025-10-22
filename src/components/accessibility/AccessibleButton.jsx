import React from 'react';

export default function AccessibleButton({
  as: Component = 'div',
  onClick,
  className,
  children,
  role = 'button',
  tabIndex = 0,
  ...rest
}) {
  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  }

  return (
    <Component
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
}