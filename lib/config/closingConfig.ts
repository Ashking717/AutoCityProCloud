// lib/config/closingConfig.ts

/**
 * Configuration for period closing behavior
 * 
 * IMPORTANT BUSINESS RULE:
 * - Business day ALWAYS starts at 12:00 AM
 * - Late-night cutoff EXTENDS the end of the business day
 * - Periods must be CONTIGUOUS (no gaps, no overlaps):
 *     next.periodStart = previous.periodEnd
 */

export interface ClosingConfig {

  /**
   * Hour (0–23) until which late-night transactions
   * belong to the PREVIOUS business day.
   *
   * Example:
   * 3  → include transactions until 03:00 AM next day
   * 0  → strict midnight cutoff
   */
  lateNightCutoffHour: number;

  /**
   * Whether to automatically include all historical data
   * in the FIRST closing only.
   *
   * Default: true
   */
  includeHistoricalDataInFirstClosing: boolean;

  /**
   * Whether to enforce sequential closing
   * (previous period must be closed first).
   *
   * STRONGLY RECOMMENDED for audit safety.
   *
   * Default: true
   */
  enforceSequentialClosing: boolean;

  /**
   * Maximum number of days to look back when creating
   * the FIRST closing.
   *
   * null = unlimited lookback
   *
   * Default: null
   */
  maxHistoricalDays: number | null;
}

/**
 * Default closing configuration
 */
export const DEFAULT_CLOSING_CONFIG: ClosingConfig = {
  lateNightCutoffHour: 3, // ✅ CHANGED FROM 4 → 3 AM
  includeHistoricalDataInFirstClosing: true,
  enforceSequentialClosing: true,
  maxHistoricalDays: null,
};

/**
 * Get closing configuration.
 *
 * In future, this can be loaded per outlet
 * from the database.
 */
export function getClosingConfig(outletId?: string): ClosingConfig {
  // Currently returns default config
  return DEFAULT_CLOSING_CONFIG;
}

/**
 * Calculate period END with late-night cutoff.
 *
 * ⚠️ NOTE:
 * - This function is intended for DAILY closing only.
 * - Monthly closing should compute its own end boundary.
 */
export function calculatePeriodEndWithCutoff(
  businessDate: Date,
  config: ClosingConfig = DEFAULT_CLOSING_CONFIG
): Date {
  const periodEnd = new Date(businessDate);
  periodEnd.setDate(periodEnd.getDate() + 1);
  periodEnd.setHours(config.lateNightCutoffHour, 0, 0, 0);
  return periodEnd;
}

/**
 * Check whether a transaction timestamp falls
 * within a closing period.
 *
 * Boundaries are INCLUSIVE.
 */
export function isDateInClosingPeriod(
  transactionDate: Date,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const tx = transactionDate.getTime();
  return tx >= periodStart.getTime() && tx < periodEnd.getTime();
}

/**
 * Format a human-readable period range.
 *
 * Example:
 * "Jan 23 to Jan 23 (including late-night until 3:00 AM next day)"
 */
export function formatPeriodRange(
  periodStart: Date,
  periodEnd: Date,
  config: ClosingConfig = DEFAULT_CLOSING_CONFIG
): string {
  const startStr = periodStart.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const displayEnd = new Date(periodEnd);
  if (displayEnd.getHours() <= config.lateNightCutoffHour) {
    displayEnd.setDate(displayEnd.getDate() - 1);
  }

  const endStr = displayEnd.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (config.lateNightCutoffHour > 0) {
    return `${startStr} to ${endStr} (including late-night until ${config.lateNightCutoffHour}:00 AM next day)`;
  }

  return `${startStr} to ${endStr}`;
}

/**
 * EXAMPLES
 *
 * 1️⃣ Sale at 02:45 AM on Jan 24
 *    → Included in Jan 23 closing
 *
 * 2️⃣ Sale at 03:05 AM on Jan 24
 *    → Included in Jan 24 closing
 *
 * 3️⃣ Next day period MUST start at previous periodEnd:
 *    Jan 23: 00:00 → Jan 24 03:00
 *    Jan 24: 03:00 → Jan 25 03:00
 *
 * This prevents overlaps and double-counting.
 */
