/**
 * Timezone Utility Functions
 * Handles conversion between UTC and local/specific timezones
 */

// Qatar timezone (UTC+3)
export const QATAR_TIMEZONE = 'Asia/Qatar';

/**
 * Convert UTC date to specified timezone
 * Note: This returns the original Date object since JavaScript Date is timezone-aware
 * The formatting functions handle the timezone display
 */
export function convertUTCToTimezone(
  utcDate: Date | string,
  timezone: string = QATAR_TIMEZONE
): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date;
}

/**
 * Format date in local timezone
 */
export function formatLocalDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-QA', {
    timeZone: QATAR_TIMEZONE,
    ...options,
  }).format(dateObj);
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
export function formatTime(
  date: Date | string,
  timezone: string = QATAR_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Format date for display (e.g., "Jan 23, 2026")
 */
export function formatDate(
  date: Date | string,
  timezone: string = QATAR_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateObj);
}

/**
 * Format datetime for display (e.g., "Jan 23, 2026 at 2:30 PM")
 */
export function formatDateTime(
  date: Date | string,
  timezone: string = QATAR_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Get relative time (e.g., "2 hours ago", "just now")
 */
export function getRelativeTime(
  date: Date | string,
  timezone: string = QATAR_TIMEZONE
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // Calculate difference in milliseconds
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(dateObj, timezone);
}

/**
 * Get current date in specified timezone
 * Returns the current Date object (timezone display is handled by formatting functions)
 */
export function getCurrentDateInTimezone(timezone: string = QATAR_TIMEZONE): Date {
  return new Date();
}

/**
 * Check if date is today in specified timezone
 */
export function isToday(
  date: Date | string,
  timezone: string = QATAR_TIMEZONE
): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
  
  const todayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today);
  
  return dateStr === todayStr;
}

/**
 * Get timezone offset string (e.g., "UTC+3")
 */
export function getTimezoneOffset(timezone: string = QATAR_TIMEZONE): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  });
  
  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');
  
  return timeZonePart?.value || 'UTC';
}

/**
 * Convert local time to UTC for API requests
 * This is used when you need to send a date to the API in UTC format
 */
export function convertLocalToUTC(
  localDate: Date | string,
  timezone: string = QATAR_TIMEZONE
): Date {
  const dateObj = typeof localDate === 'string' ? new Date(localDate) : localDate;
  
  // Get the local date string in the specified timezone
  const dateString = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(dateObj);
  
  // Parse it as UTC
  return new Date(dateString + ' UTC');
}