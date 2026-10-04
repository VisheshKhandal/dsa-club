import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deeply serializes any Mongoose document or object with ObjectIds/Dates into a plain JavaScript object
 * safe for passing across Next.js Server Components / Server Actions boundaries to Client Components.
 */
export function serializeForClient<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

