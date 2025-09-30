"use client";

import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/contexts/ThemeContext";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  // If `content` is provided we render a simple Tooltip around the children.
  // Otherwise users are expected to compose with TooltipTrigger/TooltipContent.
  content?: string;
  children?: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

function RadixContent({
  children,
  className,
  side = "top",
  align = "center",
  ...props
}: React.ComponentProps<typeof RadixTooltip.Content>) {
  const { theme } = useTheme();

  return (
    <RadixTooltip.Content
      side={side}
      align={align}
      sideOffset={6}
      className={cn(
        "z-50 rounded-lg px-3 py-2 text-sm shadow-lg max-w-xs",
        theme === "dark" ? "bg-gray-700 text-white border border-gray-600" : "bg-gray-900 text-white",
        className
      )}
      {...props}
    >
      {children}
      <RadixTooltip.Arrow className={cn("fill-current text-inherit")} />
    </RadixTooltip.Content>
  );
}

// Default export: supports both composition and simple `content` prop usage.
export default function Tooltip({ content, children, position = "top", delay = 500, className = "" }: TooltipProps) {
  // If no content prop is provided, render a provider and forward children so
  // consumers can use the Radix composition (<Tooltip><TooltipTrigger/><TooltipContent/></Tooltip>).
  if (content === undefined) {
    return <RadixTooltip.Provider>{children}</RadixTooltip.Provider>;
  }

  // Simple usage: wrap children in a Tooltip with a Content containing `content`.
  return (
    <RadixTooltip.Provider delayDuration={delay}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixContent side={position} className={className}>
          {content}
        </RadixContent>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

// Named exports for compatibility with existing imports across the codebase.
export const TooltipProvider = RadixTooltip.Provider;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipContent = RadixContent;
export const TooltipArrow = RadixTooltip.Arrow;
export { RadixTooltip };
export { Tooltip };