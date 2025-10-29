/**
 * Timezone utility functions for consistent time handling across the app
 * All times are stored in the user's timezone and converted for display
 */

import { format, parse, addMinutes } from "date-fns"
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz"

/**
 * Get the user's browser timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Get current time rounded to nearest 30 minutes in user's timezone
 */
export function getCurrentTimeRounded(timezone?: string): string {
  const tz = timezone || getUserTimezone()
  const now = new Date()
  const zonedNow = toZonedTime(now, tz)

  const minutes = zonedNow.getMinutes()
  const roundedMinutes = Math.round(minutes / 30) * 30

  zonedNow.setMinutes(roundedMinutes)
  zonedNow.setSeconds(0)
  zonedNow.setMilliseconds(0)

  return format(zonedNow, "h:mm a")
}

/**
 * Convert time from one timezone to another
 * @param time - Time string in 12-hour format (e.g., "2:30 PM")
 * @param date - Date string (e.g., "2025-10-17")
 * @param fromTimezone - Source timezone
 * @param toTimezone - Target timezone
 */
export function convertTimeBetweenTimezones(
  time: string,
  date: string,
  fromTimezone: string,
  toTimezone: string,
): string {
  // Parse the time in the source timezone
  const dateTime = parse(`${date} ${time}`, "yyyy-MM-dd h:mm a", new Date())
  const zonedTime = fromZonedTime(dateTime, fromTimezone)

  // Convert to target timezone
  return formatInTimeZone(zonedTime, toTimezone, "h:mm a")
}

/**
 * Format time in 12-hour format with AM/PM
 */
export function formatTime12Hour(time: string): string {
  // Handle various input formats
  if (time.includes("AM") || time.includes("PM") || time.includes("am") || time.includes("pm")) {
    return time
  }

  try {
    const parsed = parse(time, "HH:mm:ss", new Date())
    return format(parsed, "h:mm a")
  } catch {
    // Fallback to format without seconds
    try {
      const parsed = parse(time, "HH:mm", new Date())
      return format(parsed, "h:mm a")
    } catch (error) {
      console.error("[v0] Error parsing time:", time, error)
      return time // Return original if parsing fails
    }
  }
}

/**
 * Convert 12-hour format to 24-hour format for database storage
 */
export function formatTime24Hour(time: string): string {
  if (!time.includes("AM") && !time.includes("PM") && !time.includes("am") && !time.includes("pm")) {
    // Already in 24-hour format, ensure it has seconds
    if (time.split(":").length === 2) {
      return `${time}:00`
    }
    return time
  }

  // Convert from 12-hour to 24-hour format
  const parsed = parse(time, "h:mm a", new Date())
  return format(parsed, "HH:mm:ss")
}

/**
 * Generate time options for dropdowns (every 30 minutes)
 */
export function generateTimeOptions(): string[] {
  const options: string[] = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < 48; i++) {
    const time = addMinutes(start, i * 30)
    options.push(format(time, "h:mm a"))
  }

  return options
}

/**
 * Get time 2 hours from a given time
 */
export function getTwoHoursLater(time: string): string {
  const parsed = parse(time, "h:mm a", new Date())
  const later = addMinutes(parsed, 120)
  return format(later, "h:mm a")
}

/**
 * Format date for display
 */
export function formatDateDisplay(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "EEEE, MMMM d")
}

/**
 * Check if two time ranges overlap
 */
export function doTimesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parse(start1, "h:mm a", new Date())
  const e1 = parse(end1, "h:mm a", new Date())
  const s2 = parse(start2, "h:mm a", new Date())
  const e2 = parse(end2, "h:mm a", new Date())

  return s1 < e2 && s2 < e1
}
