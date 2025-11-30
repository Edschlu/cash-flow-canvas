/**
 * Formats a number as Euro currency
 */
export function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number as Euro currency without decimals
 */
export function formatEuroShort(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return formatEuro(value);
}

/**
 * Parse Euro string back to number
 */
export function parseEuro(value: string): number {
  if (!value) return 0;
  const cleanValue = value.replace(/[^0-9,-]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
}

/**
 * Format date as readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Format date as month/year
 */
export function formatMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'short',
  }).format(d);
}

/**
 * Get month names for display
 */
export function getMonthName(monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return months[monthIndex] || '';
}

/**
 * Formats a number as currency (alias for formatEuro)
 */
export function formatCurrency(value: number): string {
  return formatEuro(value);
}
