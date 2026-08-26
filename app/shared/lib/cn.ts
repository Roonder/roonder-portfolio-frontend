import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn(...)` — Tailwind class merger. The ONLY definition in the app
 * (ADR-11). Joins `clsx(...)` with `twMerge(...)` so conditional
 * class arrays collapse and the last writer wins on conflicting
 * Tailwind utilities.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
