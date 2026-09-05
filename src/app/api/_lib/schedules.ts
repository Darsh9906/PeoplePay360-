import { z } from "zod";
import { dayNames, weeklyHoursFromLines } from "@/lib/schedule/hours";

const lineSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().length(5),
  endTime: z.string().length(5),
  breakMinutes: z.coerce.number().int().min(0).default(0),
});

export const scheduleSchema = z.object({
  name: z.string().min(1),
  lines: z.array(lineSchema).optional(),
  // Legacy shorthand: one time window applied to a list of weekday names.
  workingDays: z.array(z.string().min(1)).optional(),
  startTime: z.string().length(5).optional(),
  endTime: z.string().length(5).optional(),
  breakDurationMinutes: z.coerce.number().int().min(0).default(0),
  timezone: z.string().min(1).default("Asia/Kolkata"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type ScheduleLine = z.infer<typeof lineSchema>;

function dayIndex(day: string) {
  const normalized = day.trim().toLowerCase();
  return dayNames.findIndex((name) => name.toLowerCase() === normalized);
}

/** Safely parse workingDays array, preventing JSON.parse syntax errors on malformed DB strings. */
export function parseWorkingDays(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Fallback for legacy comma-separated values like "1,2,3,4,5" or "Monday,Tuesday"
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Accepts either explicit per-day lines or the legacy
 * workingDays + startTime/endTime shorthand, and returns normalized lines.
 */
export function resolveLines(input: Partial<ScheduleInput>): ScheduleLine[] {
  if (input.lines?.length) {
    return [...input.lines].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  if (!input.workingDays?.length || !input.startTime || !input.endTime) {
    return [];
  }

  return input.workingDays
    .map((day) => dayIndex(day))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)
    .map((dayOfWeek) => ({
      dayOfWeek,
      startTime: input.startTime as string,
      endTime: input.endTime as string,
      breakMinutes: input.breakDurationMinutes ?? 0,
    }));
}

/** Header fields kept in sync with the lines so legacy readers still work. */
export function headerFromLines(lines: ScheduleLine[]) {
  const days = [...new Set(lines.map((line) => line.dayOfWeek))].sort();

  return {
    workingDays: JSON.stringify(days.map((day) => dayNames[day])),
    startTime: lines[0]?.startTime ?? "09:00",
    endTime: lines[0]?.endTime ?? "18:00",
    breakDurationMinutes: lines[0]?.breakMinutes ?? 0,
    weeklyHours: weeklyHoursFromLines(lines).toFixed(2),
  };
}
