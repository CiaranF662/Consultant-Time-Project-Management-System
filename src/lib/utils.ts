import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility to conditionally merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
return twMerge(clsx(inputs));
}
