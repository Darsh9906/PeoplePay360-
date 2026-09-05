export const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type ScheduleLineInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
};

export function dayName(dayOfWeek: number) {
  return dayNames[dayOfWeek] ?? "Unknown";
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return hours * 60 + minutes;
}

/** Paid minutes for one line, treating an end time before the start as an overnight shift. */
export function lineMinutes(line: ScheduleLineInput) {
  const start = toMinutes(line.startTime);
  const end = toMinutes(line.endTime);
  const span = end >= start ? end - start : end + 24 * 60 - start;

  return Math.max(span - (line.breakMinutes ?? 0), 0);
}

export function lineHours(line: ScheduleLineInput) {
  return lineMinutes(line) / 60;
}

/** Total weekly hours derived from the pattern — never entered by hand. */
export function weeklyHoursFromLines(lines: ScheduleLineInput[]) {
  const total = lines.reduce((sum, line) => sum + lineMinutes(line), 0) / 60;

  return Math.round(total * 100) / 100;
}

/** Distinct weekdays the pattern covers, used for expected-day calculations. */
export function workingDaysFromLines(lines: ScheduleLineInput[]) {
  return [...new Set(lines.map((line) => line.dayOfWeek))].sort();
}

/** How many days in [start, end] fall on one of the schedule's working weekdays. */
export function expectedDaysInPeriod(
  workingDays: number[],
  periodStart: string,
  periodEnd: string,
) {
  if (workingDays.length === 0) {
    return 0;
  }

  const allowed = new Set(workingDays);
  const start = new Date(`${periodStart}T00:00:00Z`);
  const end = new Date(`${periodEnd}T00:00:00Z`);
  let count = 0;

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    if (allowed.has(cursor.getUTCDay())) {
      count += 1;
    }
  }

  return count;
}

/** Human label for a schedule, derived from its computed weekly hours. */
export function scheduleTypeLabel(weeklyHours: number | null | undefined) {
  const hours = Number(weeklyHours ?? 0);

  if (hours <= 0) {
    return "Not set";
  }

  if (hours >= 38) {
    return "Full time";
  }

  if (hours >= 20) {
    return "Part time";
  }

  return "Flexible";
}
