import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency in QAR
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-QA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

// Format date and time
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-QA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Generate invoice number
export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${random}`;
}

// Generate voucher number
export function generateVoucherNumber(type: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${type}-${year}${month}-${random}`;
}

// Calculate tax amount
export function calculateTax(amount: number, taxRate: number): number {
  return Number(((amount * taxRate) / 100).toFixed(2));
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Qatar format)
export function isValidQatarPhone(phone: string): boolean {
  const phoneRegex = /^(\+974)?[3456789]\d{7}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Generate SKU
export function generateSKU(category: string = 'GEN'): string {
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${category.toUpperCase().slice(0, 3)}-${random}`;
}

// Get stock status
export function getStockStatus(current: number, min: number, max?: number): {
  status: 'critical' | 'low' | 'normal' | 'high';
  color: string;
  label: string;
} {
  if (current === 0) {
    return { status: 'critical', color: 'red', label: 'Out of Stock' };
  }
  if (current <= min) {
    return { status: 'low', color: 'yellow', label: 'Low Stock' };
  }
  if (max && current >= max) {
    return { status: 'high', color: 'blue', label: 'Overstock' };
  }
  return { status: 'normal', color: 'green', label: 'In Stock' };
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Get initials from name
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Sleep function for delays
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get fiscal year dates
export function getFiscalYearDates(fiscalYearStart?: Date): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  if (fiscalYearStart) {
    const startMonth = fiscalYearStart.getMonth();
    const startDay = fiscalYearStart.getDate();
    
    const start = new Date(currentYear, startMonth, startDay);
    const end = new Date(currentYear + 1, startMonth, startDay - 1);
    
    // If we're before the fiscal year start, use last year
    if (now < start) {
      start.setFullYear(currentYear - 1);
      end.setFullYear(currentYear);
    }
    
    return { start, end };
  }
  
  // Default: Calendar year
  return {
    start: new Date(currentYear, 0, 1),
    end: new Date(currentYear, 11, 31),
  };
}

// Parse query parameters from URL
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url);
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// Safe number parsing
export function safeParseFloat(value: any, defaultValue: number = 0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function safeParseInt(value: any, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
