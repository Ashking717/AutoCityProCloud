// lib/config/closingConfig.ts

/**
 * Configuration for period closing behavior
 */

export interface ClosingConfig {
  /**
   * Late night cutoff hour (24-hour format)
   * Transactions up to this hour on the next day will be included in the previous day's closing
   * Default: 6 (6:00 AM)
   * 
   * Example: If set to 6, a sale at 2:00 AM on Jan 23rd will be included in Jan 22nd closing
   */
  lateNightCutoffHour: number;

  /**
   * Whether to automatically include all historical data in the first closing
   * Default: true
   */
  includeHistoricalDataInFirstClosing: boolean;

  /**
   * Whether to enforce sequential closing (must close previous period before current)
   * Default: true (recommended for audit trail)
   */
  enforceSequentialClosing: boolean;

  /**
   * Maximum days to look back for historical data in first closing
   * Set to null for unlimited lookback
   * Default: null (unlimited)
   */
  maxHistoricalDays: number | null;
}

export const DEFAULT_CLOSING_CONFIG: ClosingConfig = {
  lateNightCutoffHour: 6, // 6:00 AM
  includeHistoricalDataInFirstClosing: true,
  enforceSequentialClosing: true,
  maxHistoricalDays: null,
};

/**
 * Get closing configuration
 * In the future, this could be loaded from database per outlet
 */
export function getClosingConfig(outletId?: string): ClosingConfig {
  // For now, return default config
  // In production, you might want to load this from database based on outlet preferences
  return DEFAULT_CLOSING_CONFIG;
}

/**
 * Calculate the period end date/time based on configuration
 */
export function calculatePeriodEndWithCutoff(
  baseDate: Date,
  config: ClosingConfig = DEFAULT_CLOSING_CONFIG
): Date {
  const periodEnd = new Date(baseDate);
  periodEnd.setDate(periodEnd.getDate() + 1);
  periodEnd.setHours(config.lateNightCutoffHour, 0, 0, 0);
  return periodEnd;
}

/**
 * Check if a transaction date falls within a closing period
 */
export function isDateInClosingPeriod(
  transactionDate: Date,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const txTime = transactionDate.getTime();
  return txTime >= periodStart.getTime() && txTime <= periodEnd.getTime();
}

/**
 * Format period range for display
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

  const endDate = new Date(periodEnd);
  // Adjust display to show the actual business day
  if (endDate.getHours() <= config.lateNightCutoffHour) {
    endDate.setDate(endDate.getDate() - 1);
  }

  const endStr = endDate.toLocaleDateString('en-US', {
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
 * Example usage notes:
 * 
 * 1. For a shop that closes at 2 AM:
 *    Set lateNightCutoffHour to 4 or 6 to capture all late-night sales
 * 
 * 2. For a 24-hour operation:
 *    Set lateNightCutoffHour to 0 for exact midnight cutoff
 * 
 * 3. For first-time setup:
 *    includeHistoricalDataInFirstClosing: true ensures all past transactions
 *    are included in the very first closing
 */